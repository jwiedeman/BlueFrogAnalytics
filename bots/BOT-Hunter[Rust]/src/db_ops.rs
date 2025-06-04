use std::sync::Arc;

use chrono::Utc;
use flume::Sender;
use scylla::{Session, batch::{Batch, BatchType}};

use crate::constants::{BATCH_SIZE, MAX_BATCH_SIZE};
use crate::utils::{normalize_db_domain, is_valid_domain};

pub async fn mark_processed(
    session: Arc<Session>,
    domain: &str,
    success: bool,
    unreachable: bool,
    variation_json: String,
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
            domain.to_string(),
        )
    ).await;
}

pub async fn batch_insert_domains(session: Arc<Session>, domains: Vec<String>) {
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

pub async fn continuous_domain_harvest(session: Arc<Session>, tx: Sender<String>) -> Result<(), Box<dyn std::error::Error>> {
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
        tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;
        return Ok(());
    }

    println!("[HARVEST LOOP] Found {} domains with status=0", domains.len());

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

    for d in domains {
        if let Err(e) = tx.send_async(d).await {
            eprintln!("[HARVEST LOOP] Failed to queue domain: {}", e);
        }
    }
    println!("[HARVEST LOOP] Harvested {} domains", domain_count);
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    Ok(())
}

pub async fn seed_initial_domains(session: Arc<Session>, tx: &Sender<String>) -> Result<(), Box<dyn std::error::Error>> {
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

pub async fn log_progress(session: Arc<Session>) {
    loop {
        let query_str = "SELECT COUNT(*) FROM domain_discovery.domains WHERE status=0 ALLOW FILTERING";
        let prep = match session.prepare(query_str).await {
            Ok(p) => p,
            Err(e) => {
                eprintln!("[LOG PROGRESS] Prepare error: {}", e);
                tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;
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
        tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;
    }
}

pub async fn recover_abandoned_domains(session: Arc<Session>) {
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

pub async fn validate_statuses(session: Arc<Session>) {
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
