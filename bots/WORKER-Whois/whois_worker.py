#!/usr/bin/env python3
import time
from concurrent.futures import ThreadPoolExecutor
from collections import defaultdict
import threading
import whois

from cassandra.cluster import Cluster
from cassandra.policies import DCAwareRoundRobinPolicy, RetryPolicy
from cassandra import Unavailable, OperationTimedOut, WriteTimeout, ReadTimeout

CONCURRENCY = 5

# Dynamic delay to respect WHOIS rate limits
MIN_DELAY = 1.0
MAX_DELAY = 120.0
current_delay = MIN_DELAY
_delay_lock = threading.Lock()


def _throttle():
    """Sleep for the current delay with a lock to serialize requests."""
    with _delay_lock:
        time.sleep(current_delay)


def _increase_delay():
    """Double the delay up to MAX_DELAY."""
    global current_delay
    current_delay = min(current_delay * 2, MAX_DELAY)
    print(f"Backing off. Delay is now {current_delay:.1f}s")


def _decrease_delay():
    """Slowly reduce the delay back towards MIN_DELAY."""
    global current_delay
    if current_delay > MIN_DELAY:
        current_delay = max(MIN_DELAY, current_delay / 2)


def safe_execute(session, query, params):
    delay = 5
    while True:
        try:
            return session.execute(query, params)
        except (OperationTimedOut, Unavailable, WriteTimeout, ReadTimeout) as e:
            print(f"Error ({type(e).__name__}): {e}. Retrying in {delay}s...")
            time.sleep(delay)
            delay = min(delay * 2, 60)


def fetch_rows(session):
    rows = session.execute(
        "SELECT domain, tld, registrar, registered, updated FROM domains_processed"
    )
    for r in rows:
        if not (r.registrar and r.registered and r.updated):
            yield r.domain, r.tld


def whois_lookup(domain):
    info = defaultdict(str)
    _throttle()
    try:
        w = whois.whois(domain)
        text = str(w).lower()
        if "terms of service" in text or "readme" in text:
            print("TOS or README detected; backing off")
            _increase_delay()
        else:
            _decrease_delay()
        info["registrar"] = w.registrar or ""
        if w.creation_date:
            date = w.creation_date[0] if isinstance(w.creation_date, list) else w.creation_date
            info["registered"] = date.isoformat() if hasattr(date, "isoformat") else str(date)
        if w.updated_date:
            date = w.updated_date[0] if isinstance(w.updated_date, list) else w.updated_date
            info["updated"] = date.isoformat() if hasattr(date, "isoformat") else str(date)
    except Exception as e:
        print(f"WHOIS error for {domain}: {e}")
        if any(msg in str(e).lower() for msg in ["temporary failure", "timed out", "name or service not known"]):
            _increase_delay()
    return info


def process_domain(session, stmt, domain, tld):
    full = f"{domain.strip().strip('.')}.{tld.strip().strip('.')}"
    print(f"Processing WHOIS for {full}")
    info = whois_lookup(full)
    if not info:
        return
    params = (
        info.get("registered", ""),
        info.get("registrar", ""),
        info.get("updated", ""),
        domain,
        tld,
    )
    safe_execute(session, stmt, params)


def main():
    cluster = Cluster(
        contact_points=["192.168.1.201", "192.168.1.202", "192.168.1.203", "192.168.1.204"],
        load_balancing_policy=DCAwareRoundRobinPolicy(local_dc="datacenter1"),
        default_retry_policy=RetryPolicy(),
        protocol_version=4,
        connect_timeout=600,
        idle_heartbeat_timeout=600,
    )
    try:
        session = cluster.connect("domain_discovery")
        session.default_timeout = 600
        update_q = (
            "UPDATE domain_discovery.domains_processed SET "
            "registered=?, registrar=?, updated=? WHERE domain=? AND tld=?"
        )
        update_stmt = session.prepare(update_q)

        with ThreadPoolExecutor(max_workers=CONCURRENCY) as executor:
            futures = []
            for domain, tld in fetch_rows(session):
                futures.append(executor.submit(process_domain, session, update_stmt, domain, tld))
                time.sleep(MIN_DELAY)
            for f in futures:
                f.result()
    finally:
        cluster.shutdown()


if __name__ == "__main__":
    main()
