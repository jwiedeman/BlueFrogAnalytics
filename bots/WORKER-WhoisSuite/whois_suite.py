#!/usr/bin/env python3
"""Combined worker that fetches newest domains from whoisds.com and
updates WHOIS info in Cassandra. Runs periodically every INTERVAL_HOURS
(12 by default) to avoid hammering upstream servers."""

import io
import os
import time
import zipfile
import threading
from concurrent.futures import ThreadPoolExecutor

import requests
from bs4 import BeautifulSoup
from cassandra.cluster import Cluster
from cassandra.policies import DCAwareRoundRobinPolicy, RetryPolicy
from cassandra import Unavailable, OperationTimedOut, WriteTimeout, ReadTimeout
import tldextract
import whois

INTERVAL_HOURS = int(os.environ.get("INTERVAL_HOURS", "12"))
CONCURRENCY = 5
MIN_DELAY = 1.0
MAX_DELAY = 120.0
_current_delay = MIN_DELAY
_delay_lock = threading.Lock()


def _throttle():
    with _delay_lock:
        time.sleep(_current_delay)


def _increase_delay():
    global _current_delay
    _current_delay = min(_current_delay * 2, MAX_DELAY)
    print(f"Backing off. Delay is now {_current_delay:.1f}s")


def _decrease_delay():
    global _current_delay
    if _current_delay > MIN_DELAY:
        _current_delay = max(MIN_DELAY, _current_delay / 2)


def _safe_execute(session, query, params):
    delay = 5
    while True:
        try:
            return session.execute(query, params)
        except (OperationTimedOut, Unavailable, WriteTimeout, ReadTimeout) as e:
            print(f"Cassandra error ({type(e).__name__}): {e}. Retrying in {delay}s...")
            time.sleep(delay)
            delay = min(delay * 2, 60)


def _cassandra_session():
    url = os.environ.get(
        "CASSANDRA_URL",
        "192.168.1.201,192.168.1.202,192.168.1.203,192.168.1.204",
    )
    hosts = [h.strip() for h in url.split(",") if h.strip()]
    keyspace = os.environ.get("CASSANDRA_KEYSPACE", "domain_discovery")
    cluster = Cluster(
        contact_points=hosts,
        load_balancing_policy=DCAwareRoundRobinPolicy(local_dc="datacenter1"),
        default_retry_policy=RetryPolicy(),
        protocol_version=4,
        connect_timeout=600,
        idle_heartbeat_timeout=600,
    )
    session = cluster.connect(keyspace)
    session.default_timeout = 600
    return cluster, session


def _scrape_links():
    url = "https://whoisds.com/newly-registered-domains"
    resp = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    links = []
    for row in soup.select("table.table.table-bordered tr")[1:]:
        href = row.find("a")
        if not href:
            continue
        link = href.get("href", "").strip()
        if not link:
            continue
        if link.startswith("/"):
            link = "https://whoisds.com" + link
        if link.endswith("/nrd") or link.endswith(".zip"):
            links.append(link)
    return links


def _download_domains(link):
    resp = requests.get(link, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()
    with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
        for name in zf.namelist():
            if not name.lower().endswith((".txt", ".nrd", ".csv")):
                continue
            with zf.open(name) as f:
                text = f.read().decode("utf-8", errors="ignore")
                for line in text.splitlines():
                    line = line.strip()
                    if line:
                        yield line


def _insert_domains(session, domains):
    insert_q = "INSERT INTO domains_processed (domain, tld) VALUES (?, ?)"
    batch = session.new_batch()
    count = 0
    for raw_domain in domains:
        ext = tldextract.extract(raw_domain)
        if not ext.domain or not ext.suffix:
            continue
        batch.add(insert_q, (ext.domain, ext.suffix))
        count += 1
        if count >= 100:
            _safe_execute(session, batch)
            batch = session.new_batch()
            count = 0
    if count:
        _safe_execute(session, batch)


def _fetch_domains_needing_whois(session):
    rows = session.execute(
        "SELECT domain, tld, registrar, registered, updated FROM domains_processed"
    )
    for r in rows:
        if not (r.registrar and r.registered and r.updated):
            yield r.domain, r.tld


def _whois_lookup(domain):
    _throttle()
    try:
        w = whois.whois(domain)
        text = str(w).lower()
        if "terms of service" in text or "readme" in text:
            _increase_delay()
        else:
            _decrease_delay()
        data = {
            "registrar": w.registrar or "",
            "registered": "",
            "updated": "",
        }
        if w.creation_date:
            d = w.creation_date[0] if isinstance(w.creation_date, list) else w.creation_date
            data["registered"] = d.isoformat() if hasattr(d, "isoformat") else str(d)
        if w.updated_date:
            d = w.updated_date[0] if isinstance(w.updated_date, list) else w.updated_date
            data["updated"] = d.isoformat() if hasattr(d, "isoformat") else str(d)
        return data
    except Exception as e:
        print(f"WHOIS error for {domain}: {e}")
        if any(t in str(e).lower() for t in ["temporary failure", "timed out", "name or service not known"]):
            _increase_delay()
        return {}


def _update_whois(session, domain, tld, info):
    if not info:
        return
    update_q = (
        "UPDATE domain_discovery.domains_processed SET registered=?, registrar=?, updated=?"
        " WHERE domain=? AND tld=?"
    )
    params = (
        info.get("registered", ""),
        info.get("registrar", ""),
        info.get("updated", ""),
        domain,
        tld,
    )
    _safe_execute(session, update_q, params)


def _process_whois(session):
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as exe:
        futures = []
        for domain, tld in _fetch_domains_needing_whois(session):
            full = f"{domain}.{tld}"
            futures.append(
                exe.submit(
                    lambda d=full, dom=domain, tl=tld: _update_whois(session, dom, tl, _whois_lookup(d))
                )
            )
            time.sleep(MIN_DELAY)
        for f in futures:
            f.result()


def main():
    cluster, session = _cassandra_session()
    try:
        while True:
            print("Fetching newest domain links...")
            links = _scrape_links()
            all_domains = []
            for link in links:
                all_domains.extend(list(_download_domains(link)))
            print(f"Inserting {len(all_domains)} domains...")
            _insert_domains(session, all_domains)
            print("Running WHOIS updates...")
            _process_whois(session)
            print(f"Sleeping for {INTERVAL_HOURS} hours...")
            time.sleep(INTERVAL_HOURS * 3600)
    finally:
        cluster.shutdown()


if __name__ == "__main__":
    main()
