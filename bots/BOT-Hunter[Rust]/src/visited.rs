use std::sync::Arc;

use dashmap::DashMap;
use tokio::time::Duration;
use scylla::Session;

pub async fn sync_visited_with_db(session: Arc<Session>, visited: Arc<DashMap<String, ()>>) {
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

pub async fn sync_visited_loop(session: Arc<Session>, visited: Arc<DashMap<String, ()>>) {
    loop {
        println!("[VISITED SYNC LOOP] Resyncing visited dashmap...");
        sync_visited_with_db(session.clone(), visited.clone()).await;
        tokio::time::sleep(Duration::from_secs(30)).await;
    }
}
