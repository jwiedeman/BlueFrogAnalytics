// To build this tool, initialize your module and fetch dependencies:
//   go mod init github.com/you/certstream_etl
//   go get github.com/dustin/go-humanize github.com/gocql/gocql golang.org/x/net/publicsuffix
// Then build with:
//   go build -o certstream_etl unload_certstream_domains.go

package main

import (
	"fmt"
	"log"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/dustin/go-humanize"
	"github.com/gocql/gocql"
	"golang.org/x/net/publicsuffix"
)

// parseDomain reduces a raw URL into its domain, tld, and subdomain.
func parseDomain(raw string) (domain, tld, sub string, err error) {
	host := strings.TrimSuffix(strings.TrimPrefix(raw, "https://"), "/")
	host = strings.TrimPrefix(host, "http://")

	eTLD1, err := publicsuffix.EffectiveTLDPlusOne(host)
	if err != nil {
		return "", "", "", err
	}
	suffix, _ := publicsuffix.PublicSuffix(host)
	domain = strings.TrimSuffix(eTLD1, "."+suffix)
	tld = suffix

	if idx := strings.LastIndex(host, "."+eTLD1); idx > 0 {
		sub = host[:idx]
	}
	if sub == "www" {
		sub = ""
	}
	return domain, tld, sub, nil
}

// retry retries fn up to attempts, waiting delay between.
func retry(attempts int, delay time.Duration, fn func() error) error {
	var err error
	for i := 0; i < attempts; i++ {
		err = fn()
		if err == nil {
			return nil
		}
		time.Sleep(delay)
	}
	return err
}

// worker processes domains, upserts, deletes, and logs formatted progress.
func worker(
	rows <-chan string,
	session *gocql.Session,
	updateCQL, deleteCQL string,
	wg *sync.WaitGroup,
	processed *int64,
	estimatedTotal *int64,
	start time.Time,
) {
	defer wg.Done()
	for raw := range rows {
		dp, suffix, sub, err := parseDomain(raw)
		if err != nil {
			log.Printf("Parse error %q: %v", raw, err)
		} else if sub != "" {
			subSet := []string{sub}
			err = retry(3, time.Second, func() error {
				return session.Query(updateCQL, subSet, dp, suffix).
					Consistency(gocql.One).
					Exec()
			})
			if err != nil {
				log.Printf("Upsert failed for %q: %v", raw, err)
			}
		}
		err = retry(3, time.Second, func() error {
			return session.Query(deleteCQL, raw).
				Consistency(gocql.One).
				Exec()
		})
		if err != nil {
			log.Printf("Delete failed for %q: %v", raw, err)
		}

		count := atomic.AddInt64(processed, 1)
		if count%10000 == 0 {
			var newTotal int64
			if err := session.Query(
				`SELECT sum(partitions_count) FROM system.size_estimates WHERE keyspace_name=? AND table_name=?`,
				"domain_discovery", "certstream_domains",
			).Scan(&newTotal); err == nil {
				atomic.StoreInt64(estimatedTotal, newTotal)
			}
		}
		elapsed := time.Since(start)
		countStr := humanize.Comma(count)
		total := atomic.LoadInt64(estimatedTotal)
		totalStr := humanize.Comma(total)
		pct := float64(count) / float64(total) * 100
		totalDur := time.Duration(float64(elapsed) / (float64(count) / float64(total)))
		remaining := totalDur - elapsed
		fmt.Printf("Progress: %s/%s (%.2f%%) elapsed: %s, remaining: %s\n",
			countStr, totalStr, pct,
			elapsed.Truncate(time.Second), remaining.Truncate(time.Second),
		)
	}
}

func main() {
	start := time.Now()
	// Connect to Cassandra native transport on port 9042
	cluster := gocql.NewCluster(
		"192.168.1.201:9042",
		"192.168.1.202:9042",
		"192.168.1.203:9042",
		"192.168.1.204:9042",
	)
	cluster.DisableInitialHostLookup = false // skip gossip-port lookups
	cluster.ProtoVersion = 4                 // protocol v4 for modern Cassandra
	cluster.Port = 9042                      // native transport
	// Use generous timeouts to accommodate slow Cassandra responses
	cluster.ConnectTimeout = 120 * time.Second // dial + auth
	cluster.Timeout = 120 * time.Second        // default per-query timeout
	cluster.WriteTimeout = 120 * time.Second   // for batch/insert/write calls
	cluster.Keyspace = "domain_discovery"
	cluster.Consistency = gocql.One // fast, single-node reads
	cluster.NumConns = 1            // more connections per host
	session, err := cluster.CreateSession()
	if err != nil {
		log.Fatalf("Cassandra connect failed: %v", err)
	}
	defer session.Close()

	var estimatedTotal int64
	if err := session.Query(
		`SELECT sum(partitions_count) FROM system.size_estimates WHERE keyspace_name=? AND table_name=?`,
		"domain_discovery", "certstream_domains",
	).Scan(&estimatedTotal); err != nil {
		log.Printf("Failed to estimate total rows: %v", err)
		estimatedTotal = 0
	} else {
		log.Printf("Starting ETL: estimated %s rows", humanize.Comma(estimatedTotal))
	}

	updateCQL := `UPDATE domains_processed SET raw_subdomains = raw_subdomains + ? WHERE domain = ? AND tld = ?`
	deleteCQL := `DELETE FROM certstream_domains WHERE domain = ?`

	rowsChan := make(chan string, 1000)
	var processed int64
	var wg sync.WaitGroup
	numWorkers := runtime.NumCPU() * 1
	wg.Add(numWorkers)
	for i := 0; i < numWorkers; i++ {
		go worker(rowsChan, session, updateCQL, deleteCQL, &wg, &processed, &estimatedTotal, start)
	}

	// Paginate through certstream_domains
	pageState := []byte(nil)
	for {
		q := session.Query(`SELECT domain FROM certstream_domains`).PageSize(500)
		if pageState != nil {
			q = q.PageState(pageState)
		}
		iter := q.Iter()
		var raw string
		for iter.Scan(&raw) {
			rowsChan <- raw
		}
		pageState = iter.PageState()
		if err := iter.Close(); err != nil {
			log.Fatalf("Page fetch error: %v", err)
		}
		if len(pageState) == 0 {
			break
		}
	}
	close(rowsChan)

	wg.Wait()
	log.Println("ETL complete; certstream_domains cleared.")
}
