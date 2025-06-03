#!/usr/bin/env python3
import re
import csv
import dns.resolver
import socket
import smtplib
from ipwhois import IPWhois
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
import json

from cassandra.cluster import Cluster
from cassandra.policies import DCAwareRoundRobinPolicy, RetryPolicy

# Settings
OUTPUT_FILE = "validated_emails.csv"
BATCH_SIZE = 100
MAX_THREADS = 10
SMTP_FROM = "verify@example.com"
CASSANDRA_HOSTS = [
    "192.168.1.201",
    "192.168.1.202",
    "192.168.1.203",
    "192.168.1.204",
]
KEYSPACE = "domain_discovery"

write_lock = Lock()
email_pattern = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def is_email_format_valid(email):
    return email_pattern.match(email) is not None

def get_mx_hosts(domain):
    try:
        answers = dns.resolver.resolve(domain, 'MX')
        return sorted([r.exchange.to_text() for r in answers])
    except Exception:
        return []

def get_domain_metadata(mx_host):
    try:
        ip = socket.gethostbyname(mx_host)
        whois = IPWhois(ip)
        details = whois.lookup_rdap(depth=1)
        country = details.get('network', {}).get('country', 'Unknown')
        return ip, country
    except Exception:
        return None, "Unknown"

def smtp_verify_email(email, from_address=SMTP_FROM):
    domain = email.split('@')[1]
    mx_hosts = get_mx_hosts(domain)
    if not mx_hosts:
        return False, "No MX record"

    for mx in mx_hosts:
        try:
            server = smtplib.SMTP(timeout=10)
            server.connect(mx)
            server.helo("example.com")
            server.mail(from_address)
            code, message = server.rcpt(email)
            server.quit()

            if code == 250:
                return True, "Accepted"
            elif code == 550:
                return False, "Rejected"
            else:
                return False, f"Other ({code})"
        except Exception as e:
            return False, f"SMTP error: {e}"
    return False, "All MX attempts failed"

def validate_email(email):
    result = {
        "Email": email,
        "Format Valid": "No",
        "MX Record Found": "No",
        "MX Host": "",
        "MX IP": "",
        "Country": "",
        "SMTP Valid": "No",
        "SMTP Reason": "Not attempted"
    }

    if not is_email_format_valid(email):
        return result

    result["Format Valid"] = "Yes"
    domain = email.split('@')[1]
    mx_hosts = get_mx_hosts(domain)

    if not mx_hosts:
        result["SMTP Reason"] = "No MX record"
        return result

    result["MX Record Found"] = "Yes"
    result["MX Host"] = mx_hosts[0]

    ip, country = get_domain_metadata(mx_hosts[0])
    if ip:
        result["MX IP"] = ip
        result["Country"] = country

    smtp_ok, smtp_reason = smtp_verify_email(email)
    result["SMTP Valid"] = "Yes" if smtp_ok else "No"
    result["SMTP Reason"] = smtp_reason

    return result

def write_to_csv(rows, header_written):
    with write_lock:
        with open(OUTPUT_FILE, 'a', newline='', encoding='utf-8') as csvfile:
            fieldnames = [
                "Domain", "Email", "Format Valid", "MX Record Found", "MX Host",
                "MX IP", "Country", "SMTP Valid", "SMTP Reason"
            ]
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            if not header_written:
                writer.writeheader()
            writer.writerows(rows)

def fetch_wordpress_emails(session):
    query = "SELECT domain, tld, tech_detect, emails FROM domains_processed"
    rows = session.execute(query)
    for r in rows:
        tech_text = ""
        if r.tech_detect:
            tech_text = r.tech_detect if isinstance(r.tech_detect, str) else json.dumps(r.tech_detect)
        if 'wordpress' in tech_text.lower() and r.emails:
            for email in r.emails:
                yield f"{r.domain}.{r.tld}", email

def validate_emails_from_cassandra():
    cluster = Cluster(
        contact_points=CASSANDRA_HOSTS,
        load_balancing_policy=DCAwareRoundRobinPolicy(local_dc='datacenter1'),
        default_retry_policy=RetryPolicy(),
        protocol_version=4,
        connect_timeout=120,
        idle_heartbeat_timeout=120
    )
    header_written = False
    results = []
    total_processed = 0

    try:
        session = cluster.connect(KEYSPACE)
        emails = list(fetch_wordpress_emails(session))
    finally:
        cluster.shutdown()

    with ThreadPoolExecutor(max_workers=MAX_THREADS) as executor:
        futures = {
            executor.submit(validate_email, email): (domain, email)
            for domain, email in emails
        }
        for future in as_completed(futures):
            email_result = future.result()
            domain, email = futures[future]
            email_result["Domain"] = domain
            results.append(email_result)
            total_processed += 1

            if len(results) >= BATCH_SIZE:
                write_to_csv(results, header_written)
                header_written = True
                print(f"Appended {total_processed} results to CSV...")
                results.clear()

    if results:
        write_to_csv(results, header_written)
        print(f"Appended final {len(results)} results to CSV.")

    print(f"\nDone. Total emails processed: {total_processed}")

if __name__ == "__main__":
    validate_emails_from_cassandra()
