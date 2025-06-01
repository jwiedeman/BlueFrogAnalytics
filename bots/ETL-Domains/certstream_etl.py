#!/usr/bin/env python3

import time
import gevent.monkey
gevent.monkey.patch_all()

import cassandra.connection
from cassandra.io import geventreactor
cassandra.connection.Connection = geventreactor.GeventConnection

import tldextract
from cassandra.cluster import Cluster
from cassandra.policies import DCAwareRoundRobinPolicy, RetryPolicy
from cassandra import Unavailable, OperationTimedOut, WriteTimeout, ReadTimeout  # <-- Added ReadTimeout


def safe_execute(session, query, params):
    delay = 5  # starting backoff delay
    while True:
        try:
            return session.execute(query, params)
        except (OperationTimedOut, Unavailable, WriteTimeout, ReadTimeout) as e:
            print(f"Error ({type(e).__name__}): {e}. Retrying in {delay}s...")
            time.sleep(delay)
            # Optionally, implement exponential backoff:
            delay = min(delay * 2, 60)  # cap delay at 60 seconds

def parse_domain(raw_domain):
    """Parse domain components"""
    ext = tldextract.extract(raw_domain)
    domain_str = ext.domain
    tld_str = ext.suffix
    subdomain = f"{ext.subdomain}.{domain_str}.{tld_str}" if (
        ext.subdomain and ext.subdomain.lower() != "www"
    ) else ""
    return domain_str, tld_str, subdomain

def prepare_statements(session):
    """Prepare CQL statements with proper LWT handling"""
    return {
        'update': session.prepare("""
            UPDATE domains_processed 
            SET raw_subdomains = raw_subdomains + ?
            WHERE domain = ? AND tld = ?
            IF EXISTS
        """),
        'insert': session.prepare("""
            INSERT INTO domains_processed (domain, tld, raw_subdomains)
            VALUES (?, ?, ?)
            IF NOT EXISTS
        """)
    }

def upsert_domain(session, stmts, domain, tld, subdomain):
    """Atomic upsert with proper LWT handling"""
    additions = {subdomain} if subdomain else set()
    if not additions:
        return

    # First try to insert (will only apply if record doesn't exist)
    insert_result = safe_execute(session, stmts['insert'], 
                               (domain, tld, additions))
    
    if not insert_result.one().applied:
        # If insert failed, perform the update
        update_result = safe_execute(session, stmts['update'], 
                                   (additions, domain, tld))
        if not update_result.one().applied:
            # Last resort: full read-then-write
            current = session.execute(
                "SELECT raw_subdomains FROM domains_processed "
                "WHERE domain = %s AND tld = %s",
                (domain, tld)
            )
            existing = current.one().raw_subdomains if current.one() else set()
            merged = existing | additions
            safe_execute(session,
                "UPDATE domains_processed SET raw_subdomains = %s "
                "WHERE domain = %s AND tld = %s",
                (merged, domain, tld)
            )

def main():
    """Main ETL process"""
    # Configure cluster with execution profile
    cluster = Cluster(
        contact_points=["192.168.1.201", "192.168.1.202", 
                       "192.168.1.203", "192.168.1.204"],
        load_balancing_policy=DCAwareRoundRobinPolicy(),
        default_retry_policy=RetryPolicy(),
        # Extend timeouts to handle slow Cassandra responses
        connect_timeout=120,
        idle_heartbeat_timeout=120,
        protocol_version=4
    )
    
    try:
        session = cluster.connect("domain_discovery")
        stmts = prepare_statements(session)
        
        print("Starting domain processing...")
        start = time.time()
        total = 0
        
        rows = safe_execute(session, 
            "SELECT domain FROM certstream_domains", ()
        )
        
        for row in rows:
            if not row.domain:
                continue
            
            raw_domain = row.domain
            domain, tld, sub = parse_domain(raw_domain)
            
            if domain or tld:
                # Log before processing
                print(f"Processing: {raw_domain.ljust(50)} → "
                      f"Domain: '{domain}', TLD: '{tld}', Sub: '{sub}'")
                
                upsert_domain(session, stmts, domain, tld, sub)
                total += 1
                
                # Progress reporting
                if total % 1000 == 0:
                    elapsed = time.time() - start
                    print(f"Processed {total} domains ({total/elapsed:.1f}/sec)")
                
                time.sleep(0.001)
        
        print(f"Completed! Total processed: {total}")
        
    finally:
        cluster.shutdown()

if __name__ == "__main__":
    main()