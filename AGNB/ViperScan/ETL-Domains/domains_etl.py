#!/usr/bin/env python3

import tldextract
import cassandra.io.geventreactor
cassandra.io.geventreactor.monkey_patch()

from cassandra.cluster import Cluster

def parse_domain(raw_domain):
    """
    Use tldextract to parse the raw_domain into (domain, tld, set_of_subdomains).
    """
    ext = tldextract.extract(raw_domain)
    d = ext.domain
    t = ext.suffix
    sub_parts = ext.subdomain.split('.') if ext.subdomain else []
    return d, t, set(sub_parts)

def upsert_domain(session, domain_str, tld_str, subdomains_set):
    """
    Checks if (domain_str, tld_str) exists in domains_processed.
    - If it doesn't exist, insert a new row.
    - If it does exist, union the subdomains with the existing set and update.
    """
    select_q = """
        SELECT subdomains FROM domains_processed
        WHERE domain = %s AND tld = %s
        LIMIT 1
    """
    row = session.execute(select_q, (domain_str, tld_str)).one()

    if row is None:
        # Insert new row
        insert_q = """
            INSERT INTO domains_processed (domain, tld, subdomains)
            VALUES (%s, %s, %s)
        """
        session.execute(insert_q, (domain_str, tld_str, subdomains_set))
    else:
        # Merge subdomains
        existing_subs = row.subdomains if row.subdomains else set()
        merged_subs = existing_subs.union(subdomains_set)
        update_q = """
            UPDATE domains_processed
            SET subdomains = %s
            WHERE domain = %s AND tld = %s
        """
        session.execute(update_q, (merged_subs, domain_str, tld_str))

def main():
    # Connect to Cassandra at 192.168.1.201
    cluster = Cluster(["192.168.1.201"])
    session = cluster.connect("domain_discovery")  # keyspace
    
    # Query all rows from domains
    rows = session.execute("SELECT domain FROM domains")
    
    count = 0
    for row in rows:
        raw_domain = row.domain
        if not raw_domain:
            continue
        
        d, t, subs = parse_domain(raw_domain)
        if d or t:
            upsert_domain(session, d, t, subs)
            count += 1

    print(f"Finished processing domains. Total processed: {count}")

if __name__ == "__main__":
    main()
