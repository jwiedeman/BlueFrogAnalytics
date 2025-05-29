use std::sync::Arc;
use serde_json;
// Remove unused imports if you like:
use dashmap::DashMap;
use flume::{bounded, Receiver, Sender};
use futures_util::future::join_all;
use reqwest::{Client, redirect::Policy};
use scraper::Html;
use tokio::{sync::Semaphore, time::Duration};
use url::Url;
use chrono::Utc;
use dotenv::dotenv;
use scylla::{
    Session,
    SessionBuilder,
    batch::{Batch, BatchType},
};

#[derive(Debug, Clone, Copy)]
enum DomainMode {
    TopLevelOnly,
    All,
}

// 0=unvisited, 1=visited, 2=in-progress, 3=unreachable
const CRAWL_MODE: DomainMode = DomainMode::TopLevelOnly;
const BATCH_SIZE: usize = 2000;
const WORKERS: usize = 250;
const MAX_CONCURRENT_REQUESTS: usize = 50;
const REQUEST_TIMEOUT: u64 = 20;
const RETRIES: u32 = 1;
const MIN_RETRY_DELAY: u64 = 1;
const MAX_JITTER: u64 = 1;
const MAX_BATCH_SIZE: usize = 100; // chunk size for updates

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    let cassandra_url = std::env::var("CASSANDRA_URL")
        .unwrap_or_else(|_| "127.0.0.1:9042".to_string());
    println!("[MAIN] Using cassandra_url: {}", cassandra_url);

    let raw_session = SessionBuilder::new()
        .known_node(&cassandra_url)
        .build()
        .await?;
    let session = Arc::new(raw_session);

    println!("[MAIN] Synchronizing visited cache...");
    let visited = Arc::new(DashMap::new());
    sync_visited_with_db(session.clone(), visited.clone()).await;

    let visited_clone = visited.clone();
    let session_clone = session.clone();
    tokio::spawn(async move {
        sync_visited_loop(session_clone, visited_clone).await;
    });

    println!("[MAIN] Running recover_abandoned_domains...");
    recover_abandoned_domains(session.clone()).await;
    println!("[MAIN] Running validate_statuses...");
    validate_statuses(session.clone()).await;

    // Seed initial domains (status=0 only)
    let (tx, rx) = bounded::<String>(50_000);
    println!("[MAIN] Seeding initial domains...");
    seed_initial_domains(session.clone(), &tx).await?;

    // Continuous harvest loop
    let tx_clone = tx.clone();
    let session_clone = session.clone();
    tokio::spawn(async move {
        loop {
            match continuous_domain_harvest(session_clone.clone(), tx_clone.clone()).await {
                Ok(_) => println!("[HARVEST LOOP] Completed, restarting in 5s..."),
                Err(e) => eprintln!("[HARVEST LOOP ERROR] {}", e),
            }
            tokio::time::sleep(Duration::from_secs(5)).await;
        }
    });

    // Worker swarm
    let semaphore = Arc::new(Semaphore::new(MAX_CONCURRENT_REQUESTS));
    let client = create_client()?;
    println!("[MAIN] Launching worker swarm with {} workers...", WORKERS);

    let worker_handle = tokio::spawn(launch_worker_swarm(
        rx,
        client,
        session.clone(),
        visited.clone(),
        semaphore,
    ));

    // Log progress
    let session_clone = session.clone();
    tokio::spawn(async move {
        log_progress(session_clone).await;
    });

    tokio::try_join!(worker_handle)?;
    Ok(())
}

// ------------------------------------------------------------
// Helper
// ------------------------------------------------------------
fn create_client() -> Result<Client, Box<dyn std::error::Error>> {
    let client = Client::builder()
        .use_rustls_tls()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; x64) CrawlerBot/1.0")
        .http1_only()
        .pool_max_idle_per_host(10)
        .redirect(Policy::limited(10))
        .timeout(Duration::from_secs(REQUEST_TIMEOUT))
        .danger_accept_invalid_certs(true)
        .build()?;
    Ok(client)
}

// Just strip protocols, `www.`, and convert to lowercase
fn normalize_db_domain(domain: &str) -> String {
    domain
        .trim()
        .trim_start_matches("http://")
        .trim_start_matches("https://")
        .trim_start_matches("www.")
        .to_lowercase()
}

fn prepare_variations(original: &str, normalized: &str) -> Vec<(String, String)> {
    if original.starts_with("http://") || original.starts_with("https://") {
        if let Ok(url) = Url::parse(original) {
            let scheme = url.scheme();
            if scheme == "http" {
                return vec![
                    ("HttpWWW".to_string(), format!("http://www.{}", normalized)),
                    ("HttpNoWWW".to_string(), format!("http://{}", normalized)),
                ];
            } else {
                return vec![
                    ("HttpsWWW".to_string(), format!("https://www.{}", normalized)),
                    ("HttpsNoWWW".to_string(), format!("https://{}", normalized)),
                ];
            }
        }
    }
    vec![
        ("HttpWWW".to_string(), format!("http://www.{}", normalized)),
        ("HttpNoWWW".to_string(), format!("http://{}", normalized)),
        ("HttpsWWW".to_string(), format!("https://www.{}", normalized)),
        ("HttpsNoWWW".to_string(), format!("https://{}", normalized)),
    ]
}

fn get_registrable_domain(domain: &str) -> Option<String> {
    let parts: Vec<&str> = domain.split('.').collect();
    if parts.len() >= 2 {
        Some(format!("{}.{}", parts[parts.len() - 2], parts[parts.len() - 1]))
    } else {
        None
    }
}

fn clean_host(host: &str) -> String {
    host.replace("www.", "")
        .split(|c| c == ':' || c == '/')
        .next()
        .unwrap_or(host)
        .trim_matches('.')
        .to_lowercase()
}

fn is_valid_domain(host: &str) -> bool {
    if host.len() < 4 || host.len() > 253 {
        return false;
    }

    // Exclude direct IP addresses
    if host.parse::<std::net::IpAddr>().is_ok() {
        return false;
    }

    let parts: Vec<&str> = host.split('.').collect();
    if parts.len() < 2 {
        return false;
    }

    parts.iter().all(|part| {
        let valid_chars = part.chars().all(|c| c.is_ascii_alphanumeric() || c == '-');
        let valid_length = !part.is_empty() && part.len() <= 63;
        let valid_edges = !part.starts_with('-') && !part.ends_with('-');
        valid_chars && valid_length && valid_edges
    })
}

fn extract_domains(base_url: &str, body: &str) -> Vec<String> {
    let document = Html::parse_document(body);
    let mut domains = Vec::new();

    // Use tuple array for selectors and their attribute names.
    let selectors = [
        ("a", "href"),
        ("link[rel='canonical']", "href"),
        ("meta[property='og:url']", "content"),
    ];

    let base = Url::parse(base_url).ok();

    for (selector_str, attr_name) in selectors.iter() {
        if let Ok(selector) = scraper::Selector::parse(selector_str) {
            for element in document.select(&selector) {
                if let Some(href) = element.value().attr(attr_name) {
                    if let Some(base_url) = base.as_ref() {
                        if let Ok(url) = base_url.join(href) {
                            if let Some(host) = url.host_str() {
                                let cleaned = normalize_db_domain(host);
                                if is_valid_domain(&cleaned) {
                                    domains.push(cleaned);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    domains.sort();
    domains.dedup();
    domains.retain(|d| !d.is_empty() && !d.contains("cdn.") && !d.contains("api."));
    domains
}

// ------------------------------------------------------------
// VISITED / SYNC
// ------------------------------------------------------------
async fn sync_visited_with_db(session: Arc<Session>, visited: Arc<DashMap<String, ()>>) {
    visited.clear();
    println!("[VISITED SYNC] Clearing visited dashmap...");

    let select_str = "SELECT domain FROM domain_discovery.domains WHERE status=1 ALLOW FILTERING";
    let prep = match session.prepare(select_str).await {
        Ok(p) => p,
        Err(e) => {
            eprintln!("[VISITED SYNC] Prepare error: {}", e);
            return;
        }
    };

    match session.execute_unpaged(&prep, ()).await {
        Ok(res) => {
            if let Some(rows) = res.rows {
                println!("[VISITED SYNC] Received {} visited rows...", rows.len());
                for row in rows {
                    if let Some(domain_val) = row.columns[0].as_ref().and_then(|cval| cval.as_text()) {
                        visited.insert(domain_val.to_string(), ());
                    }
                }
            }
        }
        Err(e) => eprintln!("[VISITED SYNC] Query error: {}", e),
    }
}

async fn sync_visited_loop(session: Arc<Session>, visited: Arc<DashMap<String, ()>>) {
    loop {
        println!("[VISITED SYNC LOOP] Resyncing visited dashmap...");
        sync_visited_with_db(session.clone(), visited.clone()).await;
        tokio::time::sleep(Duration::from_secs(30)).await;
    }
}

// ------------------------------------------------------------
// Worker swarm
// ------------------------------------------------------------
async fn launch_worker_swarm(
    rx: Receiver<String>,
    client: Client,
    session: Arc<Session>,
    visited: Arc<DashMap<String, ()>>,
    semaphore: Arc<Semaphore>,
) {
    println!("[WORKER SWARM] Spawning {} workers...", WORKERS);
    let mut workers = Vec::with_capacity(WORKERS);

    for worker_id in 0..WORKERS {
        let rx = rx.clone();
        let client = client.clone();
        let session = session.clone();
        let visited = visited.clone();
        let semaphore = semaphore.clone();

        workers.push(tokio::spawn(async move {
            println!("[WORKER {}] Started worker loop...", worker_id);
            loop {
                match rx.recv_async().await {
                    Ok(domain) => {
                        println!("[WORKER {}] Received domain: {}", worker_id, domain);
                        process_domain(domain, &client, session.clone(), visited.clone(), &semaphore).await;
                    }
                    Err(_) => {
                        println!("[WORKER {}] Shutting down; queue empty.", worker_id);
                        tokio::time::sleep(Duration::from_secs(5)).await;
                    }
                }
            }
        }));
    }

    join_all(workers).await;
}

async fn process_domain(
    domain: String,
    client: &Client,
    session: Arc<Session>,
    visited: Arc<DashMap<String, ()>>,
    semaphore: &Semaphore,
) {
    let clean_domain = normalize_db_domain(&domain);
    if visited.contains_key(&clean_domain) {
        println!("[PROCESS] Already visited: {}", clean_domain);
        return;
    }

    let _permit = match semaphore.acquire().await {
        Ok(p) => p,
        Err(_) => return,
    };

    match crawl_domain(&clean_domain, client, session.clone()).await {
        Ok((new_domains, json_data)) => {
            batch_insert_domains(session.clone(), new_domains).await;
            mark_processed(session.clone(), &clean_domain, true, false, json_data).await;
            visited.insert(clean_domain, ());
        }
        Err(e) => {
            eprintln!("[PROCESS ERROR] {}: {}", clean_domain, e);
            let error_json = serde_json::json!({
                "HttpWWW": false,
                "HttpNoWWW": false,
                "HttpsWWW": false,
                "HttpsNoWWW": false
            }).to_string();
            mark_processed(session.clone(), &clean_domain, false, true, error_json).await;
        }
    }
}

// ------------------------------------------------------------
// Crawling logic
// ------------------------------------------------------------
async fn crawl_domain(
    domain: &str,
    client: &Client,
    session: Arc<Session>,
) -> Result<(Vec<String>, String), Box<dyn std::error::Error + Send + Sync>> {
    let normalized = normalize_db_domain(domain);
    let variations = prepare_variations(domain, &normalized);
    let mut variation_results = serde_json::Map::new();
    let mut discovered = Vec::new();
    let mut any_success = false;

    let (_select_variation, insert_variation) = tokio::try_join!(
        session.prepare("SELECT success FROM domain_discovery.domain_variations WHERE domain=? AND variation=?"),
        session.prepare("INSERT INTO domain_discovery.domain_variations (domain, variation, success, status_code, final_url, redirect_count, attempted_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    )?;

    for (variation_kind, url) in variations.iter() {
        let result = attempt_variation(url, client).await;
        let (success, status_code, final_url, redirect_count) = match result {
            Ok(Some((body, url, code, redirects))) => {
                let mut new_domains = extract_domains(&url, &body);
                new_domains.retain(|d| d != &normalized); // Exclude self
                discovered.extend(new_domains);
                (true, code, url, redirects)
            }
            Ok(None) | Err(_) => (false, 0, url.clone(), 0),
        };

        // Record variation attempt
        session.execute_unpaged(
            &insert_variation,
            (
                &normalized,
                variation_kind,
                success,
                status_code,
                &final_url,
                redirect_count,
                Utc::now().timestamp_millis()
            )
        ).await?;

        variation_results.insert(variation_kind.clone(), success.into());
        any_success |= success;
    }

    if !any_success {
        return Err("All variations failed".into());
    }

    Ok((
        discovered,
        serde_json::to_string(&variation_results)?
    ))
}

async fn attempt_variation(
    url: &str,
    client: &Client
) -> Result<Option<(String, String, i32, i32)>, Box<dyn std::error::Error + Send + Sync>> {
    println!("[ATTEMPT VARIATION] Starting with url={}", url);

    let mut current_url = url.to_string();
    let mut redirect_count = 0;
    let max_redirects = 10;

    loop {
        let resp = match client.get(&current_url).send().await {
            Ok(r) => r,
            Err(e) => {
                return Err(e.into());
            }
        };

        let status_code_u16 = resp.status().as_u16();
        if (300..400).contains(&status_code_u16) {
            // 3xx => redirect
            redirect_count += 1;
            if redirect_count > max_redirects {
                println!("[ATTEMPT VARIATION] Exceeded max_redirects => returning None");
                return Ok(None);
            }
            if let Some(loc_value) = resp.headers().get(reqwest::header::LOCATION) {
                let loc_str = loc_value.to_str()?;
                let next_url = if loc_str.starts_with("http://") || loc_str.starts_with("https://") {
                    loc_str.to_string()
                } else {
                    match Url::parse(&current_url)?.join(loc_str) {
                        Ok(u) => u.to_string(),
                        Err(_) => {
                            println!("[ATTEMPT VARIATION] Could not join relative => returning None");
                            return Ok(None);
                        }
                    }
                };
                println!("[ATTEMPT VARIATION] {} => redirect #{} => {}", current_url, redirect_count, next_url);
                current_url = next_url;
                continue;
            } else {
                println!("[ATTEMPT VARIATION] 3xx but no Location => None");
                return Ok(None);
            }
        } else if resp.status().is_success() {
            let body = resp.text().await?;
            let final_url = current_url.clone();
            let status_code_i32 = status_code_u16 as i32;
            let redirect_count_i32 = redirect_count as i32;
            println!(
                "[ATTEMPT VARIATION] success => final_url={}, code={}, redirects={}",
                final_url, status_code_i32, redirect_count_i32
            );
            return Ok(Some((body, final_url, status_code_i32, redirect_count_i32)));
        } else {
            // 4xx/5xx => treat as unreachable
            println!("[ATTEMPT VARIATION] Non-success code={} => None", status_code_u16);
            return Ok(None);
        }
    }
}

async fn mark_processed(
    session: Arc<Session>, 
    domain: &str, 
    success: bool, 
    unreachable: bool,
    variation_json: String
) {
    let new_status = if success { 1 } else if unreachable { 3 } else { 0 };

    let update_str = "UPDATE domain_discovery.domains 
        SET status=?, variation_success_json=?, last_attempted=?
        WHERE domain=?";

    let prep = match session.prepare(update_str).await {
        Ok(p) => p,
        Err(e) => {
            eprintln!("[MARK PROCESSED] Prepare error: {}", e);
            return;
        }
    };

    let _ = session.execute_unpaged(
        &prep, 
        (
            new_status,
            variation_json,
            Utc::now().timestamp_millis(),
            domain.to_string()
        )
    ).await;
}

// ------------------------------------------------------------
// BATCH INSERT DOMAINS
// ------------------------------------------------------------
async fn batch_insert_domains(session: Arc<Session>, domains: Vec<String>) {
    if domains.is_empty() {
        return;
    }

    let insert_str = "
        INSERT INTO domain_discovery.domains 
        (domain, status, created_at) 
        VALUES (?, 0, ?) IF NOT EXISTS
    ";

    let insert_prep = match session.prepare(insert_str).await {
        Ok(p) => p,
        Err(e) => {
            eprintln!("[BATCH INSERT] Prepare error: {}", e);
            return;
        }
    };

    let now_ms = Utc::now().timestamp_millis();
    let total_domains = domains.len();
    let mut success_count = 0;

    for domain in domains.into_iter() {
        let clean_domain = normalize_db_domain(&domain);
        if !is_valid_domain(&clean_domain) {
            continue;
        }

        match session.execute_unpaged(&insert_prep, (&clean_domain, now_ms)).await {
            Ok(_) => success_count += 1,
            Err(e) => eprintln!("[INSERT ERROR] {}: {}", clean_domain, e),
        }
    }

    println!("[BATCH INSERT] Successfully inserted {}/{} domains", success_count, total_domains);
}

// ------------------------------------------------------------
// HARVEST / SEED / PROGRESS
// ------------------------------------------------------------
async fn continuous_domain_harvest(session: Arc<Session>, tx: Sender<String>) -> Result<(), Box<dyn std::error::Error>> {
    println!("[HARVEST LOOP] Checking for status=0 domains...");
    let q_str = format!(
        "SELECT domain
         FROM domain_discovery.domains
         WHERE status=0
         LIMIT {} ALLOW FILTERING",
        BATCH_SIZE
    );
    let prep_select = session.prepare(q_str.as_str()).await?;
    let select_rows = session.execute_unpaged(&prep_select, ()).await?;

    let mut domains = Vec::new();
    if let Some(rset) = select_rows.rows {
        for row in rset {
            if let Some(d) = row.columns[0].as_ref().and_then(|cv| cv.as_text()) {
                domains.push(d.to_string());
            }
        }
    }

    if domains.is_empty() {
        println!("[HARVEST LOOP] No new domains found. Sleeping...");
        tokio::time::sleep(Duration::from_secs(10)).await;
        return Ok(());
    }

    println!("[HARVEST LOOP] Found {} domains with status=0", domains.len());

    // Now set them all => status=2
    let update_str = "UPDATE domain_discovery.domains SET status=2, last_attempted=? WHERE domain=?";
    let update_prep = session.prepare(update_str).await?;
    let now_ms = Utc::now().timestamp_millis();

    for chunk in domains.chunks(100) {
        println!("[HARVEST LOOP] chunk of size {} for updating => status=2", chunk.len());
        let mut batch = Batch::new(BatchType::Logged);
        let mut param_values = Vec::with_capacity(chunk.len());
        for d in chunk {
            batch.append_statement(update_prep.clone());
            param_values.push((now_ms, d.clone()));
        }
        session.batch(&batch, param_values).await?;
    }

    let domain_count = domains.len();
    println!("[HARVEST LOOP] Setting {} domains => status=2, queuing them...", domain_count);

    // push them into the worker queue
    for d in domains {
        if let Err(e) = tx.send_async(d).await {
            eprintln!("[HARVEST LOOP] Failed to queue domain: {}", e);
        }
    }
    println!("[HARVEST LOOP] Harvested {} domains", domain_count);
    tokio::time::sleep(Duration::from_millis(100)).await;
    Ok(())
}

async fn seed_initial_domains(session: Arc<Session>, tx: &Sender<String>) -> Result<(), Box<dyn std::error::Error>> {
    println!("[SEED INITIAL DOMAINS]...");
    let q_str = format!(
        "SELECT domain FROM domain_discovery.domains WHERE status=0 LIMIT {} ALLOW FILTERING",
        BATCH_SIZE
    );
    let prep = session.prepare(q_str.as_str()).await?;
    let rows_res = session.execute_unpaged(&prep, ()).await?;

    if let Some(rows) = rows_res.rows {
        println!("[SEED INITIAL DOMAINS] Found {} seed domains with status=0", rows.len());
        for row in rows {
            if let Some(dom_str) = row.columns[0].as_ref().and_then(|cval| cval.as_text()) {
                let _ = tx.send_async(dom_str.to_string()).await;
            }
        }
    }
    Ok(())
}

async fn log_progress(session: Arc<Session>) {
    loop {
        let query_str = "SELECT COUNT(*) FROM domain_discovery.domains WHERE status=0 ALLOW FILTERING";
        let prep = match session.prepare(query_str).await {
            Ok(p) => p,
            Err(e) => {
                eprintln!("[LOG PROGRESS] Prepare error: {}", e);
                tokio::time::sleep(Duration::from_secs(10)).await;
                continue;
            }
        };

        match session.execute_unpaged(&prep, ()).await {
            Ok(r) => {
                if let Some(rows) = r.rows {
                    if let Some(row) = rows.get(0) {
                        if let Some(count_val) = row.columns[0].as_ref().and_then(|cv| cv.as_bigint()) {
                            println!("[LOG PROGRESS] Unvisited domains: {}", count_val);
                        }
                    }
                }
            }
            Err(e) => eprintln!("[LOG PROGRESS] Query error: {}", e),
        }
        tokio::time::sleep(Duration::from_secs(10)).await;
    }
}

// ------------------------------------------------------------
// RECOVER / VALIDATE
// ------------------------------------------------------------
async fn recover_abandoned_domains(session: Arc<Session>) {
    println!("[RECOVER ABANDONED DOMAINS] Searching...");
    let select_str = "SELECT domain, last_attempted FROM domain_discovery.domains WHERE status=2 ALLOW FILTERING";
    let prep = match session.prepare(select_str).await {
        Ok(p) => p,
        Err(e) => {
            eprintln!("[RECOVER] Prepare error: {}", e);
            return;
        }
    };

    let rows = match session.execute_unpaged(&prep, ()).await {
        Ok(r) => r,
        Err(e) => {
            eprintln!("[RECOVER] Query error: {}", e);
            return;
        }
    };

    let cutoff = Utc::now().timestamp_millis() - (15 * 60_000);
    let mut abandoned = Vec::new();
    if let Some(rset) = rows.rows {
        println!("[RECOVER] Found {} rows with status=2", rset.len());
        for row in rset {
            if let Some(dom) = row.columns[0].as_ref().and_then(|cv| cv.as_text()) {
                if let Some(last_att) = row.columns[1].as_ref().and_then(|cv| cv.as_bigint()) {
                    if last_att < cutoff {
                        abandoned.push(dom.to_string());
                    }
                }
            }
        }
    }
    if abandoned.is_empty() {
        println!("[RECOVER] No abandoned domains found.");
        return;
    }
    println!("[RECOVER] Found {} abandoned => resetting to status=0", abandoned.len());

    let update_str = "UPDATE domain_discovery.domains SET status=0 WHERE domain=?";
    let update_prep = match session.prepare(update_str).await {
        Ok(u) => u,
        Err(e) => {
            eprintln!("[RECOVER] Prepare update error: {}", e);
            return;
        }
    };

    for chunk in abandoned.chunks(MAX_BATCH_SIZE) {
        println!("[RECOVER] chunk of size {} => status=0", chunk.len());
        let mut batch = Batch::new(BatchType::Logged);
        let mut param_values = Vec::with_capacity(chunk.len());
        for d in chunk {
            batch.append_statement(update_prep.clone());
            param_values.push((d.clone(),));
        }

        if let Err(e) = session.batch(&batch, param_values).await {
            eprintln!("[RECOVER] batch error: {}", e);
        }
    }
}

async fn validate_statuses(session: Arc<Session>) {
    println!("[VALIDATE STATUSES] Searching for stuck=2...");
    let select_str = "SELECT domain, last_attempted 
                      FROM domain_discovery.domains 
                      WHERE status=2 ALLOW FILTERING";
    let prep = match session.prepare(select_str).await {
        Ok(u) => u,
        Err(e) => {
            eprintln!("[VALIDATE] Prepare error: {}", e);
            return;
        }
    };

    let rows = match session.execute_unpaged(&prep, ()).await {
        Ok(r) => r,
        Err(e) => {
            eprintln!("[VALIDATE] Query error: {}", e);
            return;
        }
    };

    let cutoff = Utc::now().timestamp_millis() - (3600_000);
    let mut to_reset = Vec::new();
    if let Some(rset) = rows.rows {
        println!("[VALIDATE] Found {} rows with status=2", rset.len());
        for row in rset {
            if let Some(dom) = row.columns[0].as_ref().and_then(|cv| cv.as_text()) {
                let last_att = row.columns[1].as_ref().and_then(|cv| cv.as_bigint()).unwrap_or(0);
                if last_att < cutoff {
                    to_reset.push(dom.to_string());
                }
            }
        }
    }
    if to_reset.is_empty() {
        println!("[VALIDATE] No statuses to reset.");
        return;
    }
    println!("[VALIDATE] Found {} domains stuck => resetting status=0", to_reset.len());

    let update_str = "UPDATE domain_discovery.domains SET status=0 WHERE domain=?";
    let update_prep = match session.prepare(update_str).await {
        Ok(u) => u,
        Err(e) => {
            eprintln!("[VALIDATE] Prepare error: {}", e);
            return;
        }
    };

    for chunk in to_reset.chunks(MAX_BATCH_SIZE) {
        println!("[VALIDATE] chunk of size {} => reset to 0", chunk.len());
        let mut batch = Batch::new(BatchType::Logged);
        let mut param_values = Vec::with_capacity(chunk.len());
        for d in chunk {
            batch.append_statement(update_prep.clone());
            param_values.push((d.clone(),));
        }

        match session.batch(&batch, param_values).await {
            Ok(_) => println!("[VALIDATE] Reset chunk of size {}", chunk.len()),
            Err(e) => eprintln!("[VALIDATE] batch error: {}", e),
        }
    }

    println!("[VALIDATE] Done validating statuses.");
}
