package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"net"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gocql/gocql"
)

// Optimized settings for high throughput
var (
	httpTimeout         = 5 * time.Second
	dialTimeout         = 2 * time.Second
	tlsHandshakeTimeout = 3 * time.Second
	maxIdleConns        = 1000
	maxIdleConnsPerHost = 100
	maxConnsPerHost     = 200
	idleConnTimeout     = 90 * time.Second

	// DNS settings - faster resolution
	defaultDNSServers = "1.1.1.1:53,1.0.0.1:53,8.8.8.8:53,8.8.4.4:53," +
		"9.9.9.9:53,149.112.112.112:53,208.67.222.222:53,208.67.220.220:53," +
		"8.26.56.26:53,8.20.247.20:53,84.200.69.80:53,84.200.70.40:53," +
		"185.228.168.9:53,185.228.169.9:53,77.88.8.8:53,77.88.8.1:53," +
		"209.244.0.3:53,209.244.0.4:53"
	dnsServers = strings.Split(getEnv("DNS_SERVERS", defaultDNSServers), ",")
	dnsIndex   uint32

	// Domain recheck window
	recheckAfter = 60 * 24 * time.Hour

	// Cassandra configuration - optimized for batch operations
	cassandraHosts    = getEnv("CASSANDRA_HOSTS", "192.168.1.201,192.168.1.202,192.168.1.203,192.168.1.204")
	cassandraKeyspace = getEnv("CASSANDRA_KEYSPACE", "domain_discovery")
       // Global policy: allow up to 10 minutes for Cassandra operations
       cassandraTimeout        = 600 * time.Second
       cassandraConnectTimeout = 600 * time.Second

	concurrency    int64 = int64(getEnvInt("CONCURRENCY", runtime.NumCPU()*50))
	maxConcurrency       = getEnvInt("MAX_CONCURRENCY", runtime.NumCPU()*200)
	minConcurrency       = getEnvInt("MIN_CONCURRENCY", runtime.NumCPU()*10)
	adjustStep           = getEnvInt("ADJUST_STEP", runtime.NumCPU()*5)
	adjustInterval       = time.Duration(getEnvInt("ADJUST_INTERVAL", 30)) * time.Second
	batchSize            = getEnvInt("BATCH_SIZE", 25)
	fetchMultiple        = 5
	recentSize           = 25
	errorSleep           = 30 * time.Second
	idleSleep            = 10 * time.Second
	poolSize             = getEnvInt("POOL_SIZE", 3000)
	autoScale            = strings.ToLower(getEnv("AUTO_SCALE", "true")) != "false"

	// New: Batch update settings
	updateBatchSize     = getEnvInt("UPDATE_BATCH_SIZE", 100)
	updateFlushInterval = time.Duration(getEnvInt("UPDATE_FLUSH_INTERVAL", 2)) * time.Second
)

var userAgents = []string{
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Mozilla/5.0 (iPhone; CPU iPhone OS 15_2 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Version/15.2 Mobile/15E148 Safari/537.36",
}

func randomUserAgent() string {
	return userAgents[rand.Intn(len(userAgents))]
}

func nextDNSServer() string {
	i := atomic.AddUint32(&dnsIndex, 1)
	return dnsServers[int(i)%len(dnsServers)]
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil && i > 0 {
			return i
		}
	}
	return fallback
}

var (
	httpClient  *http.Client
	dnsResolver *net.Resolver
	sem         chan struct{}
)

func initHTTP() {
	// Create multiple DNS resolvers for better parallelism
	if len(dnsServers) > 0 {
		dnsResolver = &net.Resolver{
			PreferGo: true,
			Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
				server := nextDNSServer()
				return (&net.Dialer{Timeout: 2 * time.Second}).DialContext(ctx, "udp", server)
			},
		}
	}

	dialer := &net.Dialer{
		Timeout:   dialTimeout,
		KeepAlive: 30 * time.Second, // Enable keep-alive
		Resolver:  dnsResolver,
	}

	tr := &http.Transport{
		DialContext:           dialer.DialContext,
		TLSHandshakeTimeout:   tlsHandshakeTimeout,
		MaxIdleConns:          maxIdleConns,
		MaxIdleConnsPerHost:   maxIdleConnsPerHost,
		MaxConnsPerHost:       maxConnsPerHost,
		IdleConnTimeout:       idleConnTimeout,
		DisableCompression:    true,
		ExpectContinueTimeout: 1 * time.Second,
		ResponseHeaderTimeout: 10 * time.Second, // Don't wait forever for headers
	}

	httpClient = &http.Client{
		Transport: tr,
		Timeout:   httpTimeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse // Don't follow redirects to save time
		},
	}
}

func init() {
	rand.Seed(time.Now().UnixNano())
}

func createSession(hostsCSV, keyspace string) (*gocql.Session, error) {
	hosts := strings.Split(hostsCSV, ",")
	cluster := gocql.NewCluster(hosts...)
	cluster.Keyspace = keyspace

	// Try different consistency levels in order of preference
	consistencyLevels := []gocql.Consistency{
		gocql.LocalOne,
		gocql.One,
		gocql.LocalQuorum,
		gocql.Quorum,
		gocql.Any,
	}

	var session *gocql.Session
	var err error

	for _, consistency := range consistencyLevels {
		cluster.Consistency = consistency
		cluster.Timeout = cassandraTimeout
		cluster.ConnectTimeout = cassandraConnectTimeout
		cluster.NumConns = runtime.NumCPU()
		cluster.DefaultIdempotence = true
		cluster.RetryPolicy = &gocql.SimpleRetryPolicy{NumRetries: 3}

		session, err = cluster.CreateSession()
		if err == nil {
			log.Printf("Connected to Cassandra with consistency level: %v", consistency)
			return session, nil
		}
		log.Printf("Failed to connect with consistency %v: %v", consistency, err)
	}

	return nil, fmt.Errorf("failed to connect to Cassandra with any consistency level: %v", err)
}

type domainRow struct {
	Domain      string
	TLD         string
	Status      *bool
	LastChecked *time.Time
}

type updateBatch struct {
	Domain string
	TLD    string
	Status bool
	Time   string
}

func parseBool(v interface{}) *bool {
	switch val := v.(type) {
	case bool:
		b := val
		return &b
	case string:
		if parsed, err := strconv.ParseBool(val); err == nil {
			b := parsed
			return &b
		}
	case []byte:
		if parsed, err := strconv.ParseBool(string(val)); err == nil {
			b := parsed
			return &b
		}
	case int, int32, int64:
		var i int64
		switch n := val.(type) {
		case int:
			i = int64(n)
		case int32:
			i = int64(n)
		case int64:
			i = n
		}
		b := i != 0
		return &b
	}
	return nil
}

func parseTime(v interface{}) *time.Time {
	switch val := v.(type) {
	case time.Time:
		tm := val
		return &tm
	case string:
		layouts := []string{time.RFC3339, "2006-01-02T15:04:05"}
		for _, layout := range layouts {
			if parsed, err := time.Parse(layout, val); err == nil {
				tm := parsed
				return &tm
			}
		}
	case []byte:
		return parseTime(string(val))
	}
	return nil
}

func fetchBatch(session *gocql.Session, size int) ([]domainRow, error) {
	threshold := time.Now().Add(-recheckAfter)

	// Try simpler query first without ALLOW FILTERING
	queries := []string{
		fmt.Sprintf("SELECT domain, tld, status, updated FROM domains_processed LIMIT %d", size*fetchMultiple),
		fmt.Sprintf("SELECT domain, tld, status, updated FROM domains_processed WHERE updated < ? LIMIT %d ALLOW FILTERING", size*fetchMultiple),
	}

	var iter *gocql.Iter

	// Try each query approach
	for i, queryStr := range queries {
		if i == 0 {
			// First query without WHERE clause
			iter = session.Query(queryStr).Iter()
		} else {
			// Second query with WHERE clause
			iter = session.Query(queryStr, threshold.Format(time.RFC3339)).Iter()
		}

		// Test if query works by trying to get first result
		testMap := map[string]interface{}{}
		if iter.MapScan(testMap) || iter.Close() == nil {
			// Query worked, break and use this approach
			break
		}
		iter.Close()

		if i == 0 {
			// First approach failed, try second
			continue
		} else {
			// Both approaches failed
			return nil, fmt.Errorf("both query approaches failed")
		}
	}

	// Re-execute the working query since we consumed first result in test
	iter.Close()
	if threshold.Before(time.Now().Add(-24 * time.Hour)) {
		iter = session.Query(queries[1], threshold.Format(time.RFC3339)).Iter()
	} else {
		iter = session.Query(queries[0]).Iter()
	}
	defer iter.Close()

	var rows []domainRow
	rows = make([]domainRow, 0, size) // Pre-allocate capacity

	m := map[string]interface{}{}
	count := 0
	for iter.MapScan(m) && count < size*fetchMultiple {
		d, _ := m["domain"].(string)
		t, _ := m["tld"].(string)

		// Skip empty domains
		if d == "" || t == "" {
			m = map[string]interface{}{}
			count++
			continue
		}

		var st *bool
		if v, ok := m["status"]; ok && v != nil {
			st = parseBool(v)
		}
		var lc *time.Time
		if v, ok := m["updated"]; ok && v != nil {
			lc = parseTime(v)
		}

		row := domainRow{Domain: d, TLD: t, Status: st, LastChecked: lc}

		// Add all domains if we're not filtering, or filter by age/missing fields
		shouldAdd := true
		if !threshold.Before(time.Now().Add(-24 * time.Hour)) {
			shouldAdd = st == nil || lc == nil || time.Since(*lc) > recheckAfter
		}

		if shouldAdd {
			rows = append(rows, row)
			if len(rows) >= size {
				break
			}
		}

		m = map[string]interface{}{} // Reuse map
		count++
	}

	if err := iter.Close(); err != nil {
		log.Printf("Iterator close error (non-fatal): %v", err)
	}

	log.Printf("Fetched %d domains from database", len(rows))
	return rows, nil
}

func reachable(ctx context.Context, url string) bool {
	req, err := http.NewRequestWithContext(ctx, "HEAD", url, nil) // Use HEAD instead of GET
	if err != nil {
		return false
	}
	req.Header.Set("User-Agent", randomUserAgent())
	req.Header.Set("Accept", "*/*")
	req.Header.Set("Connection", "keep-alive")

	resp, err := httpClient.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	// Consider more status codes as "reachable"
	return resp.StatusCode >= 200 && resp.StatusCode < 500
}

func checkDomain(domain string) bool {
	variants := []string{
		"https://" + domain,
		"https://www." + domain,
		"http://" + domain,
		"http://www." + domain,
	}

	ctx, cancel := context.WithTimeout(context.Background(), httpTimeout)
	defer cancel()

	result := make(chan bool, 1)
	var wg sync.WaitGroup

	for _, u := range variants {
		wg.Add(1)
		go func(url string) {
			defer wg.Done()
			if reachable(ctx, url) {
				select {
				case result <- true:
				default:
				}
				cancel()
			}
		}(u)
	}

	go func() {
		wg.Wait()
		close(result)
	}()

	for up := range result {
		if up {
			return true
		}
	}
	return false
}

func normalizeDomain(domain, tld string) string {
	domain = strings.Trim(domain, ".")
	tld = strings.Trim(tld, ".")
	full := domain + "." + tld
	for strings.Contains(full, "..") {
		full = strings.ReplaceAll(full, "..", ".")
	}
	return full
}

// Batch updater for better Cassandra performance
type BatchUpdater struct {
	session   *gocql.Session
	updates   []updateBatch
	mu        sync.Mutex
	lastFlush time.Time
}

func NewBatchUpdater(session *gocql.Session) *BatchUpdater {
	bu := &BatchUpdater{
		session:   session,
		updates:   make([]updateBatch, 0, updateBatchSize),
		lastFlush: time.Now(),
	}

	// Auto-flush goroutine
	go func() {
		ticker := time.NewTicker(updateFlushInterval)
		defer ticker.Stop()
		for range ticker.C {
			bu.Flush()
		}
	}()

	return bu
}

func (bu *BatchUpdater) Add(domain, tld string, status bool) {
	bu.mu.Lock()
	defer bu.mu.Unlock()

	bu.updates = append(bu.updates, updateBatch{
		Domain: domain,
		TLD:    tld,
		Status: status,
		Time:   time.Now().UTC().Format(time.RFC3339),
	})

	if len(bu.updates) >= updateBatchSize {
		bu.flushLocked()
	}
}

func (bu *BatchUpdater) Flush() {
	bu.mu.Lock()
	defer bu.mu.Unlock()
	bu.flushLocked()
}

func (bu *BatchUpdater) flushLocked() {
	if len(bu.updates) == 0 {
		return
	}

	// Try batch update first, fall back to individual updates
	batch := gocql.NewBatch(gocql.UnloggedBatch) // Use unlogged batch for better performance
	for _, u := range bu.updates {
		batch.Query(`UPDATE domains_processed SET status=?, updated=? WHERE domain=? AND tld=?`,
			u.Status, u.Time, u.Domain, u.TLD)
	}

	err := bu.session.ExecuteBatch(batch)
	if err != nil {
		log.Printf("batch update failed, trying individual updates: %v", err)
		// Fall back to individual updates
		successCount := 0
		for _, u := range bu.updates {
			if err := bu.session.Query(`UPDATE domains_processed SET status=?, updated=? WHERE domain=? AND tld=?`,
				u.Status, u.Time, u.Domain, u.TLD).Exec(); err == nil {
				successCount++
			}
		}
		log.Printf("Individual updates: %d/%d successful", successCount, len(bu.updates))
	} else {
		log.Printf("Batch update successful: %d records", len(bu.updates))
	}

	bu.updates = bu.updates[:0] // Reset slice but keep capacity
	bu.lastFlush = time.Now()
}

var (
	printMu   sync.Mutex
	pendingMu sync.RWMutex
	pending   = make(map[string]struct{})
)

func moveCursor(row, col int) {
	fmt.Printf("\033[%d;%dH", row, col)
}

func clearScreen() {
	fmt.Print("\033[2J")
	moveCursor(1, 1)
}

func updateProgress(start time.Time, total, up, down, workers, limit int64, recent []string) {
	rate := float64(total) / time.Since(start).Seconds()
	printMu.Lock()
	clearScreen()
	fmt.Println("DomainStatus Worker (Optimized)")
	fmt.Printf("tested %d (up:%d down:%d) rate: %.1f/s workers:%d/%d\n", total, up, down, rate, workers, limit)
	fmt.Printf("pending queue: %d\n", len(pending))
	if len(recent) > 0 {
		fmt.Println("recent:")
		for _, d := range recent {
			fmt.Println("  " + d)
		}
	}
	printMu.Unlock()
}

func main() {
	log.SetFlags(0)

	// Set GOMAXPROCS to use all available CPUs
	runtime.GOMAXPROCS(runtime.NumCPU())

	initHTTP()
	session, err := createSession(cassandraHosts, cassandraKeyspace)
	if err != nil {
		log.Fatalf("cassandra connect failed: %v", err)
	}
	defer session.Close()

	batchUpdater := NewBatchUpdater(session)
	defer batchUpdater.Flush()

	var totalChecked int64
	var totalUp int64
	var totalDown int64
	var workersActive int64
	var lastMu sync.Mutex
	recent := make([]string, 0, recentSize)
	start := time.Now()

	if poolSize < maxConcurrency {
		poolSize = maxConcurrency * 3 // Larger buffer
	}

	jobs := make(chan domainRow, poolSize)

	clearScreen()
	fmt.Println("DomainStatus Worker (Optimized)")
	fmt.Println()

	// Progress reporter
	go func() {
		ticker := time.NewTicker(time.Second)
		defer ticker.Stop()
		for range ticker.C {
			lastMu.Lock()
			rec := append([]string(nil), recent...)
			lastMu.Unlock()
			updateProgress(start, atomic.LoadInt64(&totalChecked), atomic.LoadInt64(&totalUp), atomic.LoadInt64(&totalDown), atomic.LoadInt64(&workersActive), atomic.LoadInt64(&concurrency), rec)
		}
	}()

	// Multiple fetchers for better throughput
	numFetchers := 1 // Start with just one fetcher to debug

	for f := 0; f < numFetchers; f++ {
		go func(fetcherID int) {
			log.Printf("Starting fetcher %d", fetcherID)
			for {
				if len(jobs) >= poolSize*3/4 {
					time.Sleep(100 * time.Millisecond)
					continue
				}

				log.Printf("Fetcher %d: Attempting to fetch batch", fetcherID)
				rows, err := fetchBatch(session, batchSize)
				if err != nil {
					log.Printf("Fetcher %d fetch error: %v", fetcherID, err)
					time.Sleep(errorSleep)
					continue
				}

				log.Printf("Fetcher %d: Got %d rows", fetcherID, len(rows))
				if len(rows) == 0 {
					log.Printf("Fetcher %d: No rows, sleeping", fetcherID)
					time.Sleep(idleSleep)
					continue
				}

				addedCount := 0
				for _, r := range rows {
					d := normalizeDomain(r.Domain, r.TLD)
					if d == "" {
						continue
					}

					pendingMu.Lock()
					if _, exists := pending[d]; !exists {
						pending[d] = struct{}{}
						select {
						case jobs <- r:
							addedCount++
						default:
							// Queue full, skip this domain for now
							delete(pending, d)
						}
					}
					pendingMu.Unlock()
				}
				log.Printf("Fetcher %d: Added %d jobs to queue", fetcherID, addedCount)

				if addedCount == 0 {
					time.Sleep(5 * time.Second) // Brief pause if nothing was added
				}
			}
		}(f)
	}

	// Initialize semaphore
	sem = make(chan struct{}, maxConcurrency)
	for i := 0; i < int(concurrency); i++ {
		sem <- struct{}{}
	}

	// Worker goroutines
	for i := 0; i < maxConcurrency; i++ {
		go func() {
			for row := range jobs {
				<-sem
				atomic.AddInt64(&workersActive, 1)

				d := normalizeDomain(row.Domain, row.TLD)
				up := checkDomain(d)

				// Use batch updater instead of individual updates
				batchUpdater.Add(row.Domain, row.TLD, up)

				pendingMu.Lock()
				delete(pending, d)
				pendingMu.Unlock()

				var label string
				if up {
					atomic.AddInt64(&totalUp, 1)
					label = d + " [UP]"
				} else {
					atomic.AddInt64(&totalDown, 1)
					label = d + " [DOWN]"
				}
				atomic.AddInt64(&totalChecked, 1)

				lastMu.Lock()
				recent = append(recent, label)
				if len(recent) > recentSize {
					recent = recent[len(recent)-recentSize:]
				}
				lastMu.Unlock()

				atomic.AddInt64(&workersActive, -1)
				sem <- struct{}{}
			}
		}()
	}

	// Enhanced auto-scaling
	if autoScale {
		go func() {
			ticker := time.NewTicker(adjustInterval)
			defer ticker.Stop()
			var lastTotal int64
			var stableCount int

			for range ticker.C {
				current := atomic.LoadInt64(&totalChecked)
				delta := current - lastTotal
				lastTotal = current

				curConc := int(atomic.LoadInt64(&concurrency))
				queueSize := len(jobs)

				// More aggressive scaling based on queue size
				if queueSize > poolSize/2 && curConc < maxConcurrency {
					// Queue is filling up, increase workers
					n := adjustStep * 2
					if curConc+n > maxConcurrency {
						n = maxConcurrency - curConc
					}
					for i := 0; i < n; i++ {
						sem <- struct{}{}
					}
					atomic.AddInt64(&concurrency, int64(n))
					stableCount = 0
				} else if queueSize < poolSize/4 && curConc > minConcurrency {
					stableCount++
					if stableCount > 3 { // Only scale down after being stable
						n := adjustStep
						if curConc-n < minConcurrency {
							n = curConc - minConcurrency
						}
						for i := 0; i < n; i++ {
							<-sem
						}
						atomic.AddInt64(&concurrency, int64(-n))
						stableCount = 0
					}
				}

				// Optional: log performance metrics
				_ = delta // Use delta to avoid unused variable warning
			}
		}()
	}

	select {}
}
