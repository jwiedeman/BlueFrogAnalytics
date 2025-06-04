use reqwest::{Client, redirect::Policy};
use scraper::Html;
use tokio::time::Duration;
use url::Url;

use crate::constants::REQUEST_TIMEOUT;

pub fn create_client() -> Result<Client, Box<dyn std::error::Error>> {
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
pub fn normalize_db_domain(domain: &str) -> String {
    domain
        .trim()
        .trim_start_matches("http://")
        .trim_start_matches("https://")
        .trim_start_matches("www.")
        .to_lowercase()
}

pub fn prepare_variations(original: &str, normalized: &str) -> Vec<(String, String)> {
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

pub fn get_registrable_domain(domain: &str) -> Option<String> {
    let parts: Vec<&str> = domain.split('.').collect();
    if parts.len() >= 2 {
        Some(format!("{}.{}", parts[parts.len() - 2], parts[parts.len() - 1]))
    } else {
        None
    }
}

pub fn clean_host(host: &str) -> String {
    host.replace("www.", "")
        .split(|c| c == ':' || c == '/')
        .next()
        .unwrap_or(host)
        .trim_matches('.')
        .to_lowercase()
}

pub fn is_valid_domain(host: &str) -> bool {
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

pub fn extract_domains(base_url: &str, body: &str) -> Vec<String> {
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
