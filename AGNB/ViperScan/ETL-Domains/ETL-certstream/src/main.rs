use std::time::{Duration, Instant};

use tokio::time::sleep;
use tldextract::{TldExtractor, TldOption};
use cdrs_tokio::cluster::session::SessionBuilder;
use cdrs_tokio::{
    types::{AsRust, IntoRustByName, list::List, rows::Row},
    cluster::{
        session::{Session, TcpSessionBuilder},
        NodeTcpConfigBuilder,
        TcpConnectionManager,
        NodeAddress,
    },
    load_balancing::RoundRobinLoadBalancingStrategy,
    frame::Envelope,
    query::{QueryValues},
    query_values,
    transport::TransportTcp
};

// Define the transport type
type Transport = TransportTcp;
// Define the connection manager type
type ConnectionManager = TcpConnectionManager;
// Define the load balancing type with proper generics
type LoadBalancing = RoundRobinLoadBalancingStrategy<Transport, ConnectionManager>;
// Define the session type
type SessionType = Session<Transport, ConnectionManager, LoadBalancing>;

#[derive(Debug, Clone)]
struct Domain {
    domain: String,
    tld: String,
    subdomain: String,
}

fn parse_domain(raw_domain: &str) -> Domain {
    let extractor = TldExtractor::new(TldOption::default());
    let extraction = extractor.extract(raw_domain).unwrap_or_default();

    let domain_str = extraction.domain.unwrap_or_default();
    let tld_str = extraction.suffix.unwrap_or_default();
    let subdomain = if let Some(sub) = extraction.subdomain {
        if !sub.is_empty() && sub.to_lowercase() != "www" {
            format!("{}.{}.{}", sub, domain_str, tld_str)
        } else {
            String::new()
        }
    } else {
        String::new()
    };

    Domain {
        domain: domain_str,
        tld: tld_str,
        subdomain,
    }
}

fn get_rows_from_response(resp: &Envelope) -> Option<Vec<Row>> {
    match resp.response_body() {
        Ok(body) => body.into_rows(),
        Err(_) => None
    }
}

async fn safe_execute(
    session: &mut SessionType,
    cql: &str,
    values: QueryValues,
) -> cdrs_tokio::Result<Envelope> {
    let mut delay_seconds = 5;
    loop {
        match session.query_with_values(cql, values.clone()).await {
            Ok(res) => return Ok(res),
            Err(err) => {
                eprintln!("Query error: {}. Retrying in {}s...", err, delay_seconds);
                sleep(Duration::from_secs(delay_seconds)).await;
                delay_seconds = std::cmp::min(delay_seconds * 2, 60);
            }
        }
    }
}

async fn upsert_domain(
    session: &mut SessionType,
    domain: &Domain,
) -> Result<(), Box<dyn std::error::Error>> {
    if domain.subdomain.is_empty() {
        return Ok(());
    }

    let subdomains = vec![domain.subdomain.clone()];

    let insert_cql = "INSERT INTO domains_processed (domain, tld, raw_subdomains)
                      VALUES (?, ?, ?) IF NOT EXISTS";
    let insert_values = query_values!(
        domain.domain.clone(),
        domain.tld.clone(),
        subdomains.clone()
    );

    let insert_result = safe_execute(session, insert_cql, insert_values).await?;
    let insert_rows = get_rows_from_response(&insert_result);

    if insert_rows.is_none() || insert_rows.as_ref().unwrap().is_empty() {
        return Ok(());
    }

    let rows = insert_rows.unwrap();
    let applied_opt: Option<bool> = rows[0].get_by_name("[applied]")?;
    let applied = applied_opt.unwrap_or(false);

    if !applied {
        let update_cql = "UPDATE domains_processed
                          SET raw_subdomains = raw_subdomains + ?
                          WHERE domain = ? AND tld = ?
                          IF EXISTS";
        let update_values = query_values!(
            subdomains.clone(),
            domain.domain.clone(),
            domain.tld.clone()
        );

        let update_result = safe_execute(session, update_cql, update_values).await?;
        let update_rows = get_rows_from_response(&update_result);

        if update_rows.is_some() && !update_rows.as_ref().unwrap().is_empty() {
            let rows = update_rows.unwrap();
            let u_applied_opt: Option<bool> = rows[0].get_by_name("[applied]")?;
            let u_applied = u_applied_opt.unwrap_or(false);

            if !u_applied {
                let select_cql = "SELECT raw_subdomains FROM domains_processed
                                   WHERE domain = ? AND tld = ?";
                let select_values = query_values!(
                    domain.domain.clone(),
                    domain.tld.clone()
                );

                let select_result = safe_execute(session, select_cql, select_values).await?;
                let select_rows = get_rows_from_response(&select_result);

                if select_rows.is_some() && !select_rows.as_ref().unwrap().is_empty() {
                    let rows = select_rows.unwrap();
                    // Extract the list using the List type and convert it to a Vec<String>
                    let existing_opt: Option<List> = rows[0].get_by_name("raw_subdomains")?;
                    let existing: Vec<String> = existing_opt
                        .map(|list| {
                            // as_rust returns Result<Option<T>>, so we need to unwrap both layers
                            match list.as_rust::<Vec<String>>() {
                                Ok(Some(vec)) => vec,
                                Ok(None) => Vec::new(),
                                Err(_) => Vec::new()
                            }
                        })
                        .unwrap_or_default();

                    let mut updated_list = existing.clone();
                    if !updated_list.contains(&domain.subdomain) {
                        updated_list.push(domain.subdomain.clone());
                    }

                    let final_update_cql = "UPDATE domains_processed
                                           SET raw_subdomains = ?
                                           WHERE domain = ? AND tld = ?";
                    let final_update_values = query_values!(
                        updated_list,
                        domain.domain.clone(),
                        domain.tld.clone()
                    );

                    safe_execute(session, final_update_cql, final_update_values).await?;
                }
            }
        }
    }

    Ok(())
}

async fn delete_processed_record(
    session: &mut SessionType,
    raw_domain: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let delete_cql = "DELETE FROM certstream_domains WHERE domain = ?";
    let delete_values = query_values!(raw_domain.to_string());
    safe_execute(session, delete_cql, delete_values).await?;
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let nodes = vec![
        "192.168.1.201",
        "192.168.1.202",
        "192.168.1.203",
        "192.168.1.204",
    ];

    // Parse node addresses
    let contact_points: Vec<NodeAddress> = nodes
        .iter()
        .map(|s| NodeAddress::from(s.clone()))
        .collect();

    // Build cluster configuration
    let cluster_config = NodeTcpConfigBuilder::new()
        .with_contact_points(contact_points)
        // Use the version available in your cdrs_tokio version
        // .with_version(ProtocolVersion::V4)
        .build()
        .await?;

    // Create load balancing strategy
    let load_balancing = RoundRobinLoadBalancingStrategy::new();
    
    // Create session directly with the new API
    let mut session = TcpSessionBuilder::new(load_balancing, cluster_config)
        .build()
        .await?;

    session.query("USE domain_discovery").await?;

    println!("Starting domain processing...");
    let start = Instant::now();
    let mut total = 0_usize;

    let select_cql = "SELECT domain FROM certstream_domains";
    let select_result = safe_execute(&mut session, select_cql, QueryValues::SimpleValues(vec![])).await?;
    let select_rows = get_rows_from_response(&select_result);

    if let Some(rows) = select_rows {
        for row in rows {
            let domain_opt: Option<String> = row.get_by_name("domain")?;
            let raw_domain = domain_opt.unwrap_or_default();
            
            if raw_domain.is_empty() {
                continue;
            }

            let domain_info = parse_domain(&raw_domain);
            if domain_info.domain.is_empty() && domain_info.tld.is_empty() {
                continue;
            }

            println!(
                "Processing: {:<50} → Domain: '{}', TLD: '{}', Sub: '{}'",
                raw_domain, domain_info.domain, domain_info.tld, domain_info.subdomain
            );

            upsert_domain(&mut session, &domain_info).await?;
            delete_processed_record(&mut session, &raw_domain).await?;

            total += 1;
            if total % 1000 == 0 {
                let elapsed = start.elapsed().as_secs_f64();
                println!("Processed {} domains ({:.1}/sec)", total, total as f64 / elapsed);
            }
            
            sleep(Duration::from_millis(1)).await;
        }
    }

    println!("Completed! Total processed: {}", total);
    Ok(())
}