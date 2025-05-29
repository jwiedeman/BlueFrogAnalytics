// main.go
package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"math/rand"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"os/signal"
	"regexp"
	"sort"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/gocql/gocql"
)

const (
	httpTimeout   = 120 * time.Second // allow slow sites to respond
	classifyPause = 1 * time.Second   // back-off between domains
	// number of concurrent classification workers
	classifyWorkers = 2
	userAgent       = "SiteClassifierBot/1.0"
	allowedPort     = "9042"
	// maximum LLM prompt length (~2000 words of text plus meta)
	maxLLMInput  = 16000
	maxPageWords = 2000

	// prefetch settings
	prefetchMax      = 50  // number of ready-to-classify sites
	prefetchBacklog  = 500 // domains to keep queued for reachability tests
	prefetchBatch    = 500 // DB rows to request when refilling the backlog
	fetchConcurrency = 20  // concurrent HTTP fetches when building the queue
)

var (
	dnsServers = []string{
		"8.8.8.8:53",
		"1.1.1.1:53",
		"9.9.9.9:53",
		"208.67.222.222:53",
		"64.6.64.6:53",
	}
	dnsIdx int
	dnsMu  sync.Mutex

	// optional list of hotstage domains to keep the GPU busy when no
	// new domains are available. Populated from the HOTSTAGE_DOMAINS
	// environment variable.
	hotstageDomains []string
	hotstageIdx     int

	readyCh chan candidate
)

var ansiRe = regexp.MustCompile(`\x1b\[[0-9;?]*[A-Za-z]`)

func pickDNS() string {
	dnsMu.Lock()
	d := dnsServers[dnsIdx%len(dnsServers)]
	dnsIdx++
	dnsMu.Unlock()
	return d
}

// newHTTPClient creates an HTTP client that resolves using a rotating list
// of public DNS servers and respects the extended timeout.
func newHTTPClient() *http.Client {
	resolver := &net.Resolver{
		PreferGo: true,
		Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
			d := &net.Dialer{Timeout: 5 * time.Second}
			return d.DialContext(ctx, network, pickDNS())
		},
	}
	dialer := &net.Dialer{
		Timeout:  httpTimeout,
		Resolver: resolver,
	}
	transport := &http.Transport{
		DialContext:         dialer.DialContext,
		TLSHandshakeTimeout: httpTimeout,
	}
	return &http.Client{
		Transport: transport,
		Timeout:   httpTimeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 20 {
				return http.ErrUseLastResponse
			}
			req.Header.Set("User-Agent", userAgent)
			return nil
		},
	}
}

// ─────────────────────────────────────────────────────────────
// Cassandra dialer enforcement
// ─────────────────────────────────────────────────────────────
type portEnforcerDialer struct{}

func (d *portEnforcerDialer) DialContext(ctx context.Context, network, addr string) (net.Conn, error) {
	host, port, err := net.SplitHostPort(addr)
	if err != nil {
		return nil, err
	}
	if port != allowedPort {
		log.Printf("🛑 BLOCKED attempt to connect to port %s on %s", port, host)
		return nil, fmt.Errorf("only port %s is permitted", allowedPort)
	}
	return (&net.Dialer{Timeout: 30 * time.Second}).DialContext(ctx, network, addr)
}

// PageInfo holds extracted page details for richer LLM context
type PageInfo struct {
	Title string            // content of <title>
	Meta  map[string]string // meta[name|property] -> content
	Text  string            // visible page text
	Links []string          // internal links on page
}

// candidate holds a site that has been prefetched and is ready for classification
type candidate struct {
	domain   string
	tld      string
	finalURL string
	info     *PageInfo
	hotstage bool
}

// fetchPageInfo retrieves a page and extracts title, meta headers, visible text, and internal links
func fetchPageInfo(ctx context.Context, u string) (*PageInfo, error) {
	client := newHTTPClient()
	req, _ := http.NewRequestWithContext(ctx, "GET", u, nil)
	req.Header.Set("User-Agent", userAgent)
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("non-2xx status: %d", resp.StatusCode)
	}
	raw, _ := ioutil.ReadAll(resp.Body)
	body := string(raw)
	// extract title
	title := ""
	if m := regexp.MustCompile(`(?i)<title>(.*?)</title>`).FindStringSubmatch(body); len(m) == 2 {
		title = strings.TrimSpace(m[1])
	}
	// extract meta headers
	meta := make(map[string]string)
	reMeta := regexp.MustCompile(`(?i)<meta\s+(?:name|property)=["']([^"']+)["']\s+content=["']([^"']*)["']`)
	for _, m := range reMeta.FindAllStringSubmatch(body, -1) {
		key := strings.TrimSpace(m[1])
		meta[key] = strings.TrimSpace(m[2])
	}
	// extract internal links
	parsedURL, _ := url.Parse(u)
	baseHost := parsedURL.Host
	reLink := regexp.MustCompile(`(?i)<a\s+[^>]*href=["']([^"']+)["']`)
	linkSet := make(map[string]struct{})
	for _, m := range reLink.FindAllStringSubmatch(body, -1) {
		href := strings.TrimSpace(m[1])
		switch {
		case strings.HasPrefix(href, "/"):
			linkSet[href] = struct{}{}
		case strings.HasPrefix(href, "http://"), strings.HasPrefix(href, "https://"):
			if parsedHref, err := url.Parse(href); err == nil && parsedHref.Host == baseHost {
				linkSet[href] = struct{}{}
			}
		}
	}
	links := make([]string, 0, len(linkSet))
	for l := range linkSet {
		links = append(links, l)
	}
	sort.Strings(links)
	// extract visible text
	text := regexp.MustCompile(`(?s)<script.*?>.*?</script>`).ReplaceAllString(body, "")
	text = regexp.MustCompile(`(?s)<style.*?>.*?</style>`).ReplaceAllString(text, "")
	text = regexp.MustCompile(`<[^>]+>`).ReplaceAllString(text, "")
	text = regexp.MustCompile(`\s+`).ReplaceAllString(text, " ")
	words := strings.Fields(text)
	if len(words) > maxPageWords {
		words = words[:maxPageWords]
	}
	text = strings.Join(words, " ")
	text = strings.TrimSpace(text)
	return &PageInfo{Title: title, Meta: meta, Text: text, Links: links}, nil
}

func createCassandraSession(hostsCSV, keyspace string) (*gocql.Session, error) {
	var hosts []string
	for _, h := range strings.Split(hostsCSV, ",") {
		h = strings.TrimSpace(h)
		if h == "" {
			continue
		}
		hosts = append(hosts, net.JoinHostPort(h, allowedPort))
	}
	if len(hosts) == 0 {
		return nil, fmt.Errorf("no Cassandra hosts provided")
	}
	log.Printf("🔌 Connecting to Cassandra: %v", hosts)

	cluster := gocql.NewCluster(hosts...)
	cluster.Keyspace = keyspace
	cluster.Consistency = gocql.One
	cluster.ConnectTimeout = 30 * time.Second
	cluster.Port = 9042
	cluster.Dialer = &portEnforcerDialer{}
	cluster.DisableInitialHostLookup = true
	cluster.IgnorePeerAddr = true
	cluster.PoolConfig.HostSelectionPolicy = gocql.RoundRobinHostPolicy()

	sess, err := cluster.CreateSession()
	if err != nil {
		return nil, err
	}
	// simple ping
	if err := sess.Query("SELECT now() FROM system.local").Exec(); err != nil {
		sess.Close()
		return nil, fmt.Errorf("cassandra ping failed: %v", err)
	}
	log.Println("✅ Cassandra connection verified")
	return sess, nil
}

// ─────────────────────────────────────────────────────────────
// HTTP fetcher
// ─────────────────────────────────────────────────────────────
func fetchPageText(u string) (string, error) {
	client := newHTTPClient()
	req, _ := http.NewRequest("GET", u, nil)
	req.Header.Set("User-Agent", userAgent)
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("non-2xx status: %d", resp.StatusCode)
	}
	raw, _ := ioutil.ReadAll(resp.Body)
	txt := string(raw)
	// strip scripts/styles and HTML tags
	txt = regexp.MustCompile(`(?s)<script.*?>.*?</script>`).ReplaceAllString(txt, "")
	txt = regexp.MustCompile(`(?s)<style.*?>.*?</style>`).ReplaceAllString(txt, "")
	txt = regexp.MustCompile(`<[^>]+>`).ReplaceAllString(txt, "")
	txt = regexp.MustCompile(`\s+`).ReplaceAllString(txt, " ")
	words := strings.Fields(txt)
	if len(words) > maxPageWords {
		words = words[:maxPageWords]
	}
	txt = strings.Join(words, " ")
	return strings.TrimSpace(txt), nil
}

// fetchWithVariants tries HTTP/HTTPS and www/non-www variations and returns
// the first successfully fetched page info with content.
func fetchWithVariants(ctx context.Context, domain, tld string) (*PageInfo, string, error) {
	full := domain
	if !strings.HasSuffix(full, tld) {
		full += tld
	}
	variants := []string{
		"https://" + full,
		"http://" + full,
		"https://www." + full,
		"http://www." + full,
	}

	type result struct {
		info *PageInfo
		url  string
		err  error
	}

	resCh := make(chan result, len(variants))
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	var wg sync.WaitGroup
	for _, u := range variants {
		wg.Add(1)
		go func(u string) {
			defer wg.Done()
			log.Printf("⏳ Fetching %s", u)
			info, err := fetchPageInfo(ctx, u)
			if err != nil && errors.Is(err, context.Canceled) {
				return
			}
			resCh <- result{info: info, url: u, err: err}
		}(u)
	}

	go func() {
		wg.Wait()
		close(resCh)
	}()

	var lastErr error
	for r := range resCh {
		if r.err == nil && r.info.Text != "" {
			cancel()
			// drain channel
			for range resCh {
			}
			return r.info, r.url, nil
		}
		if r.err != nil {
			lastErr = r.err
			log.Printf("⚠️ fetch error for %s: %v", r.url, r.err)
		}
	}

	if lastErr == nil {
		lastErr = fmt.Errorf("all fetch attempts failed")
	}
	return nil, "", lastErr
}

// ─────────────────────────────────────────────────────────────
// Prefetcher
// ─────────────────────────────────────────────────────────────
func prefetchLoop(ctx context.Context, session *gocql.Session) {
	type dt struct{ domain, tld string }
	backlog := make([]dt, 0, prefetchBacklog)
	sem := make(chan struct{}, fetchConcurrency)

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		// Refill backlog from DB if running low
		if len(backlog) < prefetchBacklog {
			needRows := prefetchBacklog - len(backlog)
			query := fmt.Sprintf(
				"SELECT domain, tld FROM domains_processed WHERE site_type = '' LIMIT %d ALLOW FILTERING",
				needRows,
			)
			iter := session.Query(query).WithContext(ctx).Iter()
			var d, t string
			for iter.Scan(&d, &t) {
				backlog = append(backlog, dt{d, t})
			}
			_ = iter.Close()
			if len(backlog) == 0 && len(hotstageDomains) == 0 {
				time.Sleep(30 * time.Second)
				continue
			}
		}

		if len(backlog) == 0 && len(hotstageDomains) > 0 {
			site := hotstageDomains[hotstageIdx%len(hotstageDomains)]
			hotstageIdx++
			backlog = append(backlog, dt{domain: site})

		}

		if len(readyCh) >= prefetchMax || len(backlog) == 0 || len(sem) >= fetchConcurrency {
			time.Sleep(100 * time.Millisecond)
			continue
		}

		// Dequeue a domain and fetch it concurrently
		r := backlog[0]
		backlog = backlog[1:]
		sem <- struct{}{}
		go func(r dt) {
			defer func() { <-sem }()
			info, finalURL, err := fetchWithVariants(ctx, r.domain, r.tld)
			if err != nil {
				log.Printf("⚠️ prefetch fetch error: %v", err)
				if r.tld != "" { // only update DB for real domains
					_ = session.Query(
						`UPDATE domains_processed SET site_type='fetch_error' WHERE domain=? AND tld=?`,
						r.domain, r.tld,
					).Exec()
				}
				return
			}
			cand := candidate{domain: r.domain, tld: r.tld, finalURL: finalURL, info: info}
			if r.tld == "" {
				cand.hotstage = true
			}
			select {
			case readyCh <- cand:
			case <-ctx.Done():
			}
		}(r)
	}
}

// ─────────────────────────────────────────────────────────────
// LLM wrapper (one-shot mode: spawn a process per request)
// ─────────────────────────────────────────────────────────────
type LLM struct {
	model string
}

func newLLMSession(model string) (*LLM, error) {
	return &LLM{model: model}, nil
}

func (l *LLM) request(prompt string) (string, error) {
	cmd := exec.Command("ollama", "run", l.model)
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return "", err
	}
	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		stdin.Close()
		return "", err
	}
	cmd.Stderr = os.Stderr
	if err := cmd.Start(); err != nil {
		stdin.Close()
		return "", err
	}
	if _, err := stdin.Write([]byte(prompt)); err != nil {
		stdin.Close()
		cmd.Wait()
		return "", err
	}
	stdin.Close()
	data, err := io.ReadAll(stdoutPipe)
	if err != nil {
		return "", err
	}
	if err := cmd.Wait(); err != nil {
		return "", err
	}
	output := ansiRe.ReplaceAllString(string(data), "")
	return strings.TrimSpace(output), nil
}

// ─────────────────────────────────────────────────────────────
// Three simple classifiers
// ─────────────────────────────────────────────────────────────
// buildContext assembles meta headers, title, internal links, and page text for LLM input
func buildContext(info *PageInfo) string {
	var b strings.Builder
	b.WriteString("Meta headers:\n")
	keys := make([]string, 0, len(info.Meta))
	for k := range info.Meta {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		b.WriteString(fmt.Sprintf("%s: %s\n", k, info.Meta[k]))
	}
	b.WriteString("\nTitle:\n")
	b.WriteString(info.Title)
	b.WriteString("\n\nInternal links:\n")
	for _, l := range info.Links {
		b.WriteString(l + "\n")
	}
	b.WriteString("\nPage text:\n")
	b.WriteString(info.Text)
	return b.String()
}

// getSiteType classifies a site as BUSINESS or PERSONAL based on page info
// sanitize trims LLM output to the first line after any colon and removes
// surrounding whitespace. This helps ignore chatter or explanations from the
// model, keeping only the value we asked for.
func sanitize(out string) string {
	out = strings.ReplaceAll(out, "\r", "")
	out = strings.TrimSpace(out)
	// cut at the earliest separator to avoid extra chatter
	idx := len(out)
	seps := []string{"\n", ".", "!", "?", ":"}
	for _, sep := range seps {
		if i := strings.Index(out, sep); i != -1 && i < idx {
			idx = i
		}
	}
	out = out[:idx]
	out = strings.TrimSpace(out)
	out = strings.Trim(out, "\"'")
	return out
}

// getSiteType classifies a site as BUSINESS or PERSONAL based on page info.
// The model should respond only with the single word "BUSINESS" or "PERSONAL".
func getSiteType(llm *LLM, info *PageInfo) (string, error) {
	instruction := "Classify this as either BUSINESS or PERSONAL based on if we can ifer they may make revenue or not. Respond ONLY with that single word and nothing else.\n\n"
	ctx := buildContext(info)
	if len(instruction)+len(ctx) > maxLLMInput {
		maxCtx := maxLLMInput - len(instruction)
		if maxCtx < 0 {
			ctx = ""
		} else {
			ctx = ctx[:maxCtx]
		}
	}
	prompt := instruction + ctx
	out, err := llm.request(prompt)
	if err != nil {
		return "", err
	}
	return sanitize(out), nil
}

// getSiteCategory extracts the main category of the site as a noun phrase
func getSiteCategory(llm *LLM, info *PageInfo) (string, error) {
	instruction := "Give ONLY the main CATEGORY of this site as a short noun phrase. Respond with just that phrase and nothing else, no punctuation or commentary.\n\n"
	ctx := buildContext(info)
	if len(instruction)+len(ctx) > maxLLMInput {
		maxCtx := maxLLMInput - len(instruction)
		if maxCtx < 0 {
			ctx = ""
		} else {
			ctx = ctx[:maxCtx]
		}
	}
	prompt := instruction + ctx
	out, err := llm.request(prompt)
	if err != nil {
		return "", err
	}
	return sanitize(out), nil
}

// getSiteTags provides comma-separated single-word tags for the site
func getSiteTags(llm *LLM, info *PageInfo) ([]string, error) {
	instruction := "List ONLY comma-separated single-word tags for the site's main topics or industries. Respond with just the tags separated by commas, nothing else.\n\n"
	ctx := buildContext(info)
	if len(instruction)+len(ctx) > maxLLMInput {
		maxCtx := maxLLMInput - len(instruction)
		if maxCtx < 0 {
			ctx = ""
		} else {
			ctx = ctx[:maxCtx]
		}
	}
	prompt := instruction + ctx
	out, err := llm.request(prompt)
	if err != nil {
		return nil, err
	}
	out = sanitize(out)
	clean := out
	parts := strings.Split(clean, ",")
	for i := range parts {
		parts[i] = strings.TrimSpace(parts[i])
	}
	return parts, nil
}

// classificationWorker processes candidates from readyCh using the LLM
func classificationWorker(ctx context.Context, llm *LLM, session *gocql.Session) {
	for {
		select {
		case <-ctx.Done():
			return
		case cand := <-readyCh:
			if cand.hotstage {
				log.Printf("🔥 hotstage using %s", cand.finalURL)
			} else {
				log.Printf("✅ using %s", cand.finalURL)
			}

			siteType, err1 := getSiteType(llm, cand.info)
			siteCategory, err2 := getSiteCategory(llm, cand.info)
			tags, err3 := getSiteTags(llm, cand.info)

			if err1 != nil || err2 != nil || err3 != nil {
				log.Printf("⚠️ classification error: %v %v %v", err1, err2, err3)
				time.Sleep(classifyPause)
				continue
			}

			if cand.hotstage {
				log.Printf("🔥 classified %s | %s | %s", siteType, siteCategory, strings.Join(tags, ","))
				time.Sleep(classifyPause)
				continue
			}

			tagCSV := strings.Join(tags, ",")
			if err := session.Query(
				`UPDATE domains_processed
            SET site_type=?, site_category=?, site_type_tags=?
            WHERE domain=? AND tld=?`,
				siteType, siteCategory, tagCSV, cand.domain, cand.tld,
			).Exec(); err != nil {
				log.Printf("❌ update failed: %v", err)
			} else {
				log.Printf("✅ classified %s%s | %s | %s | %s", cand.domain, cand.tld, siteType, siteCategory, tagCSV)
			}

			time.Sleep(classifyPause)
		}
	}
}

// ─────────────────────────────────────────────────────────────
// Main loop
// ─────────────────────────────────────────────────────────────
func main() {
	// load config from ENV
	cassandraHosts := os.Getenv("CASSANDRA_HOSTS")
	keyspace := os.Getenv("CASSANDRA_KEYSPACE")
	model := os.Getenv("OLLAMA_MODEL")
	hotEnv := os.Getenv("HOTSTAGE_DOMAINS")

	if cassandraHosts == "" || keyspace == "" || model == "" {
		log.Fatalln("must set CASSANDRA_HOSTS, CASSANDRA_KEYSPACE, and OLLAMA_MODEL")
	}
	// ensure Ollama CLI is available
	if _, err := exec.LookPath("ollama"); err != nil {
		log.Fatalln("🛑 Ollama CLI not found in PATH. Please install from https://ollama.com/")
	}

	if hotEnv != "" {
		parts := strings.Split(hotEnv, ",")
		for _, p := range parts {
			p = strings.TrimSpace(p)
			if p != "" {
				hotstageDomains = append(hotstageDomains, p)
			}
		}
		if len(hotstageDomains) > 0 {
			log.Printf("🔥 hotstage domains loaded: %v", hotstageDomains)
		}
	}

	session, err := createCassandraSession(cassandraHosts, keyspace)
	if err != nil {
		log.Fatalf("⚠️ Cassandra connection failed: %v", err)
	}
	defer session.Close()

	llm, err := newLLMSession(model)
	if err != nil {
		log.Fatalf("⚠️ LLM session failed: %v", err)
	}
	// note: on exit, child process will exit too

	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	// seed random for domain selection
	rand.Seed(time.Now().UnixNano())

	readyCh = make(chan candidate, prefetchMax)
	go prefetchLoop(ctx, session)

	log.Printf("▶️ Starting %d classification workers", classifyWorkers)
	var wg sync.WaitGroup
	for i := 0; i < classifyWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			classificationWorker(ctx, llm, session)
		}()
	}

	<-ctx.Done()
	log.Println("🛑 Shutdown received, waiting for workers...")
	wg.Wait()
}
