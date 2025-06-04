package main

import (
	"context"
	"encoding/json"
	"log"
	"net/url"
	"os"
	"os/signal"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"golang.org/x/net/publicsuffix"

	"github.com/gocql/gocql"
	"github.com/gorilla/websocket"
)

const bufferThreshold = 100

const (
	initialThrottle  = 50 * time.Millisecond
	maxThrottle      = 2 * time.Second
	successFactor    = 0.95
	backoffFactor    = 2.0
	circuitThreshold = 20
)

type ThrottleManager struct {
	mu                sync.Mutex
	throttle          time.Duration
	consecutiveErrors int
}

func NewThrottleManager() *ThrottleManager {
	return &ThrottleManager{throttle: initialThrottle}
}

func (t *ThrottleManager) Record(hadError bool) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if hadError {
		t.consecutiveErrors++
		t.throttle = time.Duration(float64(t.throttle) * backoffFactor)
		if t.throttle > maxThrottle {
			t.throttle = maxThrottle
		}
	} else {
		t.consecutiveErrors = 0
		t.throttle = time.Duration(float64(t.throttle) * successFactor)
		if t.throttle < initialThrottle {
			t.throttle = initialThrottle
		}
	}
}

func (t *ThrottleManager) Delay() time.Duration {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.throttle
}

func (t *ThrottleManager) CircuitOpen() bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.consecutiveErrors >= circuitThreshold
}

var debugMode bool

func main() {
	// Enable debug logs if DEBUG=true
	debugMode = os.Getenv("DEBUG") == "true"

	log.SetFlags(log.LstdFlags | log.LUTC | log.Lmicroseconds)
	log.Println("🚀 Starting CertStream ETL...")

	// --- Cassandra setup ---
	cassandraURL := os.Getenv("CASSANDRA_URL")
	if cassandraURL == "" {
		cassandraURL = "192.168.1.201:9042,192.168.1.202:9042,192.168.1.203:9042,192.168.1.204:9042"
	}
	hosts := strings.Split(cassandraURL, ",")
	cluster := gocql.NewCluster(hosts...)
	cluster.Keyspace = "domain_discovery"
	cluster.Consistency = gocql.Quorum
	cluster.NumConns = runtime.NumCPU() * 2
       // 10 minute timeouts for more tolerant operations
       cluster.Timeout = 600 * time.Second
       cluster.ConnectTimeout = 600 * time.Second
	// **Removed explicit HostSelectionPolicy** to avoid sharing panic

	// Connect with retry/backoff
	var session *gocql.Session
	var err error
	backoff := 5 * time.Second
	for {
		log.Printf("🔗 Connecting to Cassandra at %s...", cassandraURL)
		session, err = cluster.CreateSession()
		if err == nil {
			break
		}
		log.Printf("❌ Cassandra connect failed: %v", err)
		log.Printf("⏳ Retrying in %v...", backoff)
		time.Sleep(backoff)
		if backoff < 60*time.Second {
			backoff *= 2
		}
	}
	defer session.Close()
	log.Println("✅ Connected to Cassandra.")

	// Channels for raw domains and batches
	rawDomains := make(chan string, 1000)
	domainsChan := make(chan []string, 10)
	var totalInserted uint64

	throttle := NewThrottleManager()

	// Start aggregator and DB worker
	go aggregateDomains(rawDomains, domainsChan)
	go startInsertWorker(session, domainsChan, &totalInserted, throttle)

	// Handle shutdown signals
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigs
		log.Println("⚠️ Shutdown signal received")
		cancel()
		close(rawDomains)
	}()

	// Start websocket listeners with configurable endpoints
	remoteURL := os.Getenv("CERTSTREAM_REMOTE_URL")
	if remoteURL == "" {
		remoteURL = "wss://certstream.calidog.io/"
	}
	localURL := os.Getenv("CERTSTREAM_LOCAL_URL")
	if localURL == "" {
		localURL = "ws://127.0.0.1:8080/"
	}
	go startListener(ctx, remoteURL, rawDomains)
	go startListener(ctx, localURL, rawDomains)

	// Periodic insertion stats (every 30s, only if new)
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		var last uint64
		for range ticker.C {
			cur := atomic.LoadUint64(&totalInserted)
			if diff := cur - last; diff > 0 {
				log.Printf("📈 %d domains inserted in last 30s; total=%d", diff, cur)
				last = cur
			}
		}
	}()

	// Block until shutdown
	<-ctx.Done()
	log.Println("👋 Exiting.")
}

// aggregateDomains collects raw domains into batches and sends them onwards.
func aggregateDomains(raw <-chan string, out chan<- []string) {
	batch := make([]string, 0, bufferThreshold*2)
	for d := range raw {
		batch = append(batch, d)
		if len(batch) >= bufferThreshold {
			flush := make([]string, len(batch))
			copy(flush, batch)
			out <- flush
			if debugMode {
				log.Printf("💾 Flushed batch of %d domains", len(flush))
			}
			batch = batch[:0]
		}
	}
	// Flush any remaining
	if len(batch) > 0 {
		out <- batch
	}
	close(out)
}

// startListener connects to a CertStream endpoint, extracts domains, and pushes them raw.
func startListener(ctx context.Context, urlStr string, raw chan<- string) {
Reconnect:
	for {
		conn, _, err := websocket.DefaultDialer.Dial(urlStr, nil)
		if err != nil {
			if debugMode {
				log.Printf("🌐 dial error (%s): %v", urlStr, err)
			}
			select {
			case <-time.After(5 * time.Second):
				continue
			case <-ctx.Done():
				return
			}
		}

		for {
			select {
			case <-ctx.Done():
				conn.Close()
				return
			default:
				_, msgBytes, err := conn.ReadMessage()
				if err != nil {
					if debugMode {
						log.Printf("🌐 read error (%s): %v", urlStr, err)
					}
					conn.Close()
					continue Reconnect
				}
				for _, d := range extractAndNormalize(msgBytes) {
					select {
					case raw <- d:
					default:
						if debugMode {
							log.Printf("⚠️ rawDomains full, dropping: %s", d)
						}
					}
				}
			}
		}

		// reconnect after short pause
		select {
		case <-time.After(2 * time.Second):
		case <-ctx.Done():
			return
		}
	}
}

// extractAndNormalize parses a raw CertStream message and returns normalized domains.
func extractAndNormalize(msgBytes []byte) []string {
	var msg map[string]interface{}
	if err := json.Unmarshal(msgBytes, &msg); err != nil {
		if debugMode {
			log.Printf("🔍 JSON unmarshal error: %v", err)
		}
		return nil
	}
	if msg["message_type"] != "certificate_update" {
		return nil
	}
	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		return nil
	}
	leaf, ok := data["leaf_cert"].(map[string]interface{})
	if !ok {
		return nil
	}
	rawAll, ok := leaf["all_domains"].([]interface{})
	if !ok {
		return nil
	}
	out := make([]string, 0, len(rawAll))
	for _, item := range rawAll {
		ds, ok := item.(string)
		if !ok {
			continue
		}
		rawURL := ds
		if !strings.Contains(ds, "://") {
			rawURL = "https://" + ds
		}
		u, err := url.Parse(rawURL)
		if err != nil {
			continue
		}
		host := u.Hostname()
		regDomain, err := publicsuffix.EffectiveTLDPlusOne(host)
		if err != nil {
			if debugMode {
				log.Printf("🔖 publicsuffix error for %s: %v", host, err)
			}
			continue
		}
		out = append(out, "https://"+regDomain)
	}
	return out
}

// startInsertWorker reads batches of domains, inserts them into Cassandra, and updates the counter.
func startInsertWorker(
	session *gocql.Session,
	domainsChan <-chan []string,
	totalInserted *uint64,
	throttle *ThrottleManager,
) {
	for batch := range domainsChan {
		b := session.NewBatch(gocql.UnloggedBatch)
		count := 0
		for _, domainURL := range batch {
			u, err := url.Parse(domainURL)
			if err != nil {
				continue
			}
			host := u.Hostname()
			tldSuffix, _ := publicsuffix.PublicSuffix(host)
			domainName := strings.TrimSuffix(host, "."+tldSuffix)
			tld := tldSuffix

			// ⬇️  Add the sentinel empty string for site_type
			b.Query(
				"INSERT INTO domains_processed (domain, tld, site_type) VALUES (?, ?, '')",
				domainName, tld,
			)
			count++
		}
		if err := session.ExecuteBatch(b); err != nil {
			log.Printf("❌ Batch insert error: %v", err)
			throttle.Record(true)
		} else {
			atomic.AddUint64(totalInserted, uint64(count))
			if debugMode {
				log.Printf("✅ Inserted %d domains in batch", count)
			}
			throttle.Record(false)
		}
		time.Sleep(throttle.Delay())
	}
}
