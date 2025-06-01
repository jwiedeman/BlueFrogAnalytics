package main

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/gocql/gocql"
	"golang.org/x/net/publicsuffix"
)

const (
	bufferThreshold = 100
	rawChanSize     = 1000
	batchChanSize   = 10
)

var debugMode bool

func main() {
	debugMode = os.Getenv("DEBUG") == "true"
	log.SetFlags(log.LstdFlags | log.LUTC | log.Lmicroseconds)
	log.Println("🚀 Starting Whois Newest Domain Grabber...")

	cassandraURL := os.Getenv("CASSANDRA_URL")
	if cassandraURL == "" {
		cassandraURL = "192.168.1.201:9042,192.168.1.202:9042,192.168.1.203:9042,192.168.1.204:9042"
	}
	hosts := strings.Split(cassandraURL, ",")
	cluster := gocql.NewCluster(hosts...)
	keyspace := os.Getenv("CASSANDRA_KEYSPACE")
	if keyspace == "" {
		keyspace = "domain_discovery"
	}
	cluster.Keyspace = keyspace
	cluster.Consistency = gocql.Quorum
	cluster.NumConns = runtime.NumCPU()
	// Use 120s timeouts for Cassandra operations
	cluster.Timeout = 120 * time.Second
	cluster.ConnectTimeout = 120 * time.Second

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

	links, err := scrapeLinks("https://whoisds.com/newly-registered-domains")
	if err != nil {
		log.Fatalf("Error scraping links: %v", err)
	}
	log.Printf("Found %d links. Processing downloads...", len(links))

	rawDomains := make(chan string, rawChanSize)
	domainsChan := make(chan []string, batchChanSize)
	var totalInserted uint64
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		aggregateDomains(rawDomains, domainsChan)
	}()
	go func() {
		defer wg.Done()
		startInsertWorker(session, domainsChan, &totalInserted)
	}()

	if err := processDownloads(links, rawDomains); err != nil {
		log.Fatalf("Error processing downloads: %v", err)
	}
	close(rawDomains)

	wg.Wait()
	log.Printf("✅ Done. Total domains inserted: %d", atomic.LoadUint64(&totalInserted))
}

func scrapeLinks(pageURL string) ([]string, error) {
	client := &http.Client{Timeout: 15 * time.Second}
	var lastErr error
	backoff := 2 * time.Second
	const maxRetries = 3
	for i := 0; i < maxRetries; i++ {
		req, err := http.NewRequest("GET", pageURL, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to create request: %w", err)
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; WhoisGrabber/1.0)")
		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			if debugMode {
				log.Printf("Error fetching page (attempt %d): %v", i+1, err)
			}
			time.Sleep(backoff)
			backoff *= 2
			continue
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("unexpected status %s", resp.Status)
			if debugMode {
				log.Printf("Unexpected status (attempt %d): %s", i+1, resp.Status)
			}
			time.Sleep(backoff)
			backoff *= 2
			continue
		}
		doc, err := goquery.NewDocumentFromReader(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to parse HTML: %w", err)
		}
		var links []string
		doc.Find("table.table.table-bordered tr").Each(func(i int, s *goquery.Selection) {
			if i == 0 {
				return
			}
			href, exists := s.Find("td").Eq(3).Find("a").Attr("href")
			if !exists {
				return
			}
			href = strings.TrimSpace(href)
			var fullLink string
			// Normalize both whois-database and sample paths
			if strings.HasPrefix(href, "/whois-database") || strings.HasPrefix(href, "/sample") {
				fullLink = "https://whoisds.com" + href
			} else if strings.HasPrefix(href, "http") {
				fullLink = href
			} else {
				return
			}
			u, err := url.Parse(fullLink)
			if err != nil {
				return
			}
			p := u.Path
			// Only accept daily .nrd download endpoints
			if strings.HasSuffix(p, "/nrd") {
				if debugMode {
					log.Printf("Found download link: %s", fullLink)
				}
				links = append(links, fullLink)
			}
		})
		if len(links) == 0 && debugMode {
			log.Println("No download links found")
		}
		return links, nil
	}
	return nil, fmt.Errorf("failed to GET page after %d attempts: %w", maxRetries, lastErr)
}

func processDownloads(links []string, raw chan<- string) error {
	client := &http.Client{Timeout: 30 * time.Second}
	for _, link := range links {
		log.Printf("Downloading: %s", link)
		req, err := http.NewRequest("GET", link, nil)
		if err != nil {
			return fmt.Errorf("failed to create download request for %s: %w", link, err)
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; WhoisGrabber/1.0)")
		resp, err := client.Do(req)
		if err != nil {
			return fmt.Errorf("failed to download %s: %w", link, err)
		}
		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return fmt.Errorf("failed to read body: %w", err)
		}
		// Handle .zip archives or plain .nrd text lists based on URL path
		u, err := url.Parse(link)
		if err != nil {
			return fmt.Errorf("failed to parse link URL %s: %w", link, err)
		}
		p := u.Path
		// Treat both .zip and .nrd endpoints as ZIP archives containing text entries
		if strings.HasSuffix(p, ".zip") || strings.HasSuffix(p, "/nrd") {
			// ZIP archive: process only text entries
			reader := bytes.NewReader(body)
			zr, err := zip.NewReader(reader, int64(len(body)))
			if err != nil {
				return fmt.Errorf("failed to open ZIP %s: %w", link, err)
			}
			if debugMode {
				log.Printf("Processing ZIP %s: %d entries, %d bytes", link, len(zr.File), len(body))
			}
			for _, f := range zr.File {
				// Skip directories and non-text files
				if f.FileInfo().IsDir() {
					continue
				}
				ext := strings.ToLower(filepath.Ext(f.Name))
				if ext != ".txt" && ext != ".nrd" && ext != ".csv" {
					if debugMode {
						log.Printf("Skipping non-text ZIP entry %s in %s", f.Name, link)
					}
					continue
				}
				rc, err := f.Open()
				if err != nil {
					return fmt.Errorf("failed to open zip file %s in %s: %w", f.Name, link, err)
				}
				data, err := io.ReadAll(rc)
				rc.Close()
				if err != nil {
					return fmt.Errorf("failed to read file %s in %s: %w", f.Name, link, err)
				}
				// Debug: show first few lines of each entry
				if debugMode {
					lines := strings.SplitN(string(data), "\n", 5)
					for j, line := range lines {
						log.Printf("ZIP entry %s [%s] line %d: %s", link, f.Name, j, line)
					}
				}
				// Decode text: remove UTF-16 nulls/BOM if present
				cleanData := data
				if len(cleanData) >= 2 && cleanData[0] == 0xff && cleanData[1] == 0xfe {
					cleanData = cleanData[2:]
				}
				// Remove any null bytes
				if bytes.IndexByte(cleanData, 0) >= 0 {
					cleanData = bytes.ReplaceAll(cleanData, []byte{0}, []byte{})
				}
				text := string(cleanData)
				// Extract domains by line
				for _, line := range strings.Split(text, "\n") {
					d := strings.TrimSpace(line)
					if d == "" {
						continue
					}
					raw <- "https://" + d
				}
			}
		} else {
			if debugMode {
				log.Printf("Skipping unsupported content for link: %s", link)
			}
		}
	}
	return nil
}

func aggregateDomains(raw <-chan string, out chan<- []string) {
	batch := make([]string, 0, bufferThreshold)
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
	if len(batch) > 0 {
		out <- batch
	}
	close(out)
}

func startInsertWorker(session *gocql.Session, domainsChan <-chan []string, totalInserted *uint64) {
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
			tld := "." + tldSuffix
			// Skip invalid or empty domain/TLD
			if domainName == "" || tldSuffix == "" {
				continue
			}
			b.Query("INSERT INTO domains_processed (domain, tld) VALUES (?, ?)", domainName, tld)
			count++
		}
		if err := session.ExecuteBatch(b); err != nil {
			log.Printf("❌ Batch insert error: %v", err)
			if debugMode {
				log.Printf("⚠️ Debugging batch insert issues, retrying individually...")
				for _, domainURL := range batch {
					u, parseErr := url.Parse(domainURL)
					if parseErr != nil {
						log.Printf("    invalid URL '%s': %v", domainURL, parseErr)
						continue
					}
					host := u.Hostname()
					tldSuffix, _ := publicsuffix.PublicSuffix(host)
					domainName := strings.TrimSuffix(host, "."+tldSuffix)
					tld := "." + tldSuffix
					if domainName == "" || tldSuffix == "" {
						log.Printf("    skipping empty domain or TLD from URL '%s': domain='%s', tld='%s'", domainURL, domainName, tld)
						continue
					}
					singleErr := session.Query("INSERT INTO domains_processed (domain, tld) VALUES (?, ?)", domainName, tld).Exec()
					if singleErr != nil {
						log.Printf("    single insert failed for domain='%s', tld='%s': %v", domainName, tld, singleErr)
					} else {
						log.Printf("    single insert succeeded for domain='%s', tld='%s'", domainName, tld)
					}
				}
			}
		} else {
			atomic.AddUint64(totalInserted, uint64(count))
			if debugMode {
				log.Printf("✅ Inserted %d domains in batch", count)
			}
		}
	}
}
