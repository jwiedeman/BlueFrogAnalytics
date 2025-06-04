use std::sync::Arc;

use dashmap::DashMap;
use flume::Receiver;
use futures_util::future::join_all;
use reqwest::Client;
use tokio::sync::Semaphore;
use tokio::time::Duration;
use scylla::Session;

use crate::constants::{WORKERS};
use crate::utils::normalize_db_domain;
use crate::{crawler::crawl_domain, db_ops::{batch_insert_domains, mark_processed}};

pub async fn launch_worker_swarm(
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

pub async fn process_domain(
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
