mod constants;
mod utils;
mod visited;
mod crawler;
mod db_ops;
mod worker;

use crate::constants::*;
use crate::utils::create_client;
use crate::visited::{sync_visited_with_db, sync_visited_loop};
use crate::db_ops::{
    continuous_domain_harvest,
    seed_initial_domains,
    log_progress,
    recover_abandoned_domains,
    validate_statuses,
};
use crate::worker::launch_worker_swarm;

use std::sync::Arc;
use dashmap::DashMap;
use flume::bounded;
use scylla::{Session, SessionBuilder};
use tokio::sync::Semaphore;
use tokio::time::Duration;
use dotenv::dotenv;

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

    let (tx, rx) = bounded::<String>(50_000);
    println!("[MAIN] Seeding initial domains...");
    seed_initial_domains(session.clone(), &tx).await?;

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

    let session_clone = session.clone();
    tokio::spawn(async move {
        log_progress(session_clone).await;
    });

    tokio::try_join!(worker_handle)?;
    Ok(())
}
