use std::sync::Arc;

use reqwest::Client;
use chrono::Utc;
use url::Url;
use scylla::Session;

use crate::utils::{extract_domains, normalize_db_domain, prepare_variations};

pub async fn crawl_domain(
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

        session.execute_unpaged(
            &insert_variation,
            (
                &normalized,
                variation_kind,
                success,
                status_code,
                &final_url,
                redirect_count,
                Utc::now().timestamp_millis(),
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

pub async fn attempt_variation(
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
            println!("[ATTEMPT VARIATION] Non-success code={} => None", status_code_u16);
            return Ok(None);
        }
    }
}
