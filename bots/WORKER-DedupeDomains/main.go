package main

import (
	"fmt"
	"log"
	"os"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gocql/gocql"
)

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getColumns(session *gocql.Session, keyspace, table string) ([]string, error) {
	query := `SELECT column_name FROM system_schema.columns WHERE keyspace_name=? AND table_name=?`
	iter := session.Query(query, keyspace, table).Iter()
	cols := []string{}
	var name string
	for iter.Scan(&name) {
		cols = append(cols, name)
	}
	if err := iter.Close(); err != nil {
		return nil, err
	}
	return cols, nil
}

func placeholders(n int) string {
	ph := make([]string, n)
	for i := range ph {
		ph[i] = "?"
	}
	return strings.Join(ph, ",")
}

func main() {
	hosts := strings.Split(getEnv("CASSANDRA_HOSTS", "192.168.1.201,192.168.1.202,192.168.1.203,192.168.1.204"), ",")
	keyspace := getEnv("CASSANDRA_KEYSPACE", "domain_discovery")

	cluster := gocql.NewCluster(hosts...)
	cluster.Keyspace = keyspace
	cluster.Timeout = 120 * time.Second
	cluster.ConnectTimeout = 120 * time.Second
	cluster.Consistency = gocql.Quorum
	cluster.NumConns = runtime.NumCPU() * 2

	session, err := cluster.CreateSession()
	if err != nil {
		log.Fatalf("connect error: %v", err)
	}
	defer session.Close()

	cols, err := getColumns(session, keyspace, "domains_processed")
	if err != nil {
		log.Fatalf("column fetch error: %v", err)
	}

	insertStmt := fmt.Sprintf("INSERT INTO domains_processed (%s) VALUES (%s)", strings.Join(cols, ","), placeholders(len(cols)))
	deleteStmt := "DELETE FROM domains_processed WHERE domain=? AND tld=?"

	rows := make(chan map[string]interface{}, 1000)
	var scanned uint64
	var deduped uint64
	var skipped uint64
	var wg sync.WaitGroup
	workers := runtime.NumCPU() * 2
	wg.Add(workers)

	ticker := time.NewTicker(30 * time.Second)
	done := make(chan struct{})
	go func() {
		for {
			select {
			case <-ticker.C:
				s := atomic.LoadUint64(&scanned)
				d := atomic.LoadUint64(&deduped)
				sk := atomic.LoadUint64(&skipped)
				log.Printf("progress - scanned:%d deduped:%d skipped:%d", s, d, sk)
			case <-done:
				return
			}
		}
	}()

	for i := 0; i < workers; i++ {
		go func() {
			defer wg.Done()
			for m := range rows {
				d, _ := m["domain"].(string)
				t, _ := m["tld"].(string)
				cd := strings.TrimSuffix(strings.TrimSpace(d), ".")
				ct := strings.TrimPrefix(strings.TrimSuffix(strings.TrimSpace(t), "."), ".")
				if d == cd && t == ct {
					atomic.AddUint64(&skipped, 1)
					continue
				}
				vals := make([]interface{}, len(cols))
				for i, c := range cols {
					switch c {
					case "domain":
						vals[i] = cd
					case "tld":
						vals[i] = ct
					default:
						vals[i] = m[c]
					}
				}
				if err := session.Query(insertStmt, vals...).Exec(); err != nil {
					log.Printf("insert error %s.%s: %v", cd, ct, err)
					continue
				}
				if err := session.Query(deleteStmt, d, t).Exec(); err != nil {
					log.Printf("delete error %s.%s: %v", d, t, err)
				}
				atomic.AddUint64(&deduped, 1)
			}
		}()
	}

	log.Println("starting deduplication")
	iter := session.Query("SELECT * FROM domains_processed").PageSize(500).Iter()
	m := map[string]interface{}{}
	for iter.MapScan(m) {
		row := make(map[string]interface{}, len(m))
		for k, v := range m {
			row[k] = v
		}
		atomic.AddUint64(&scanned, 1)
		rows <- row
		m = map[string]interface{}{}
	}
	if err := iter.Close(); err != nil {
		log.Fatalf("query error: %v", err)
	}
	close(rows)
	wg.Wait()
	ticker.Stop()
	close(done)
	s := atomic.LoadUint64(&scanned)
	d := atomic.LoadUint64(&deduped)
	sk := atomic.LoadUint64(&skipped)
	log.Printf("deduplication complete - scanned:%d deduped:%d skipped:%d", s, d, sk)
}
