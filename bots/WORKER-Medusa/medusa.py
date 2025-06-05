#!/usr/bin/env python3
"""Medusa all-in-one scanner.

This script orchestrates multiple scanning modules. It can run a full
crawl or execute a subset of scans. Each scan should populate the
columns outlined in db_schema.md.
"""

import argparse
import json
import os
import subprocess
import time
from datetime import datetime
from typing import Any, Callable, Dict, List, Tuple

from cassandra.cluster import Cluster
from cassandra.policies import DCAwareRoundRobinPolicy, RetryPolicy
from cassandra import (
    OperationTimedOut,
    Unavailable,
    WriteTimeout,
    ReadTimeout,
)
import dns.resolver
from tldextract import extract

# Use the bundled enrichment module so this worker is self contained
try:
    from enrichment import analyze_target, is_domain_up
except Exception:  # pragma: no cover - optional dependency
    analyze_target = None
    is_domain_up = None

# Helper functions for Cassandra integration


def _safe_execute(session, query: str, params: Tuple[Any, ...]):
    delay = 5
    while True:
        try:
            return session.execute(query, params)
        except (
            OperationTimedOut,
            Unavailable,
            WriteTimeout,
            ReadTimeout,
        ) as e:
            print(f"Cassandra error ({type(e).__name__}): {e}. Retrying in {delay}s...")
            time.sleep(delay)
            delay = min(delay * 2, 60)


def _cassandra_session() -> Tuple[Cluster, Any]:
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


def _update_enrichment(session, domain: str, data: Dict[str, Any]) -> None:
    if not session:
        return
    ext = extract(domain)
    dom = ext.domain.strip().strip(".")
    tld = ext.suffix.strip().strip(".")

    update_query = """
        UPDATE domain_discovery.domains_processed SET
            status = ?,
            updated = ?,
            as_name = ?,
            as_number = ?,
            city = ?,
            continent = ?,
            continent_code = ?,
            country = ?,
            country_code = ?,
            postal_code = ?,
            isp = ?,
            languages = ?,
            lat = ?,
            lon = ?,
            org = ?,
            phone = ?,
            region = ?,
            region_name = ?,
            registered = ?,
            registrar = ?,
            ssl_issuer = ?,
            ssl_org = ?,
            x_powered_by = ?,
            tech_detect = ?,
            wordpress_asset_version = ?,
            time_zone = ?,
            title = ?,
            description = ?,
            linkedin_url = ?,
            has_about_page = ?,
            has_services_page = ?,
            has_cart_or_product = ?,
            more_than_5_internal_links = ?,
            contains_gtm_or_ga = ?,
            wordpress_version = ?,
            server_type = ?,
            server_version = ?,
            wpjson_size_bytes = ?,
            wpjson_contains_cart = ?,
            emails = ?,
            ecommerce_platforms = ?,
            sitemap_page_count = ?,
            last_enriched = ?
        WHERE domain = ? AND tld = ?
    """
    update_stmt = session.prepare(update_query)
    down_stmt = session.prepare(
        "UPDATE domain_discovery.domains_processed SET status=?, updated=? WHERE domain=? AND tld=?"
    )

    now_str = datetime.utcnow().isoformat()
    if is_domain_up and not is_domain_up(domain):
        _safe_execute(session, down_stmt, (False, now_str, dom, tld))
        return

    params = (
        True,
        now_str,
        str(data.get("asname", "")),
        str(data.get("as", "")),
        str(data.get("city", "")),
        str(data.get("continent", "")),
        str(data.get("continentCode", "")),
        str(data.get("country", "")),
        str(data.get("countryCode", "")),
        str(data.get("postal_code", "")),
        str(data.get("isp", "")),
        json.dumps(data.get("languages", {})),
        float(data.get("lat", 0.0)),
        float(data.get("lon", 0.0)),
        str(data.get("org", "")),
        json.dumps(data.get("phone", [])),
        str(data.get("region", "")),
        str(data.get("regionName", "")),
        str(data.get("registered", "")),
        str(data.get("registrar", "")),
        str(data.get("ssl_issuer", "")),
        str(data.get("ssl_org", "")),
        str(data.get("x_powered_by", "")),
        json.dumps(data.get("tech_detect", {})),
        str(data.get("wordpress_asset_version", "")),
        str(data.get("timezone", "")),
        str(data.get("title", "")),
        str(data.get("description", "")),
        str(data.get("linkedin_url", "")),
        bool(data.get("has_about_page", False)),
        bool(data.get("has_services_page", False)),
        bool(data.get("has_cart_or_product", False)),
        bool(data.get("more_than_5_internal_links", False)),
        bool(data.get("contains_gtm_or_ga", False)),
        str(data.get("wordpress_version", "")),
        str(data.get("server_type", "")),
        str(data.get("server_version", "")),
        int(data.get("wpjson_size_bytes", 0)),
        bool(data.get("wpjson_contains_cart", False)),
        json.dumps(data.get("emails", [])),
        json.dumps(data.get("ecommerce_platforms", [])),
        int(data.get("sitemap_page_count", 0)),
        now_str,
        dom,
        tld,
    )

    _safe_execute(session, update_stmt, params)


# Placeholder scan functions. Real implementations should invoke the
# dedicated workers or libraries that perform each scan.

def ssl_scan(domain: str, session: Any) -> None:
    print(f"[SSL] scanning {domain}")


def whois_scan(domain: str, session: Any) -> None:
    print(f"[WHOIS] scanning {domain}")


def dns_scan(domain: str, session: Any) -> None:
    print(f"[DNS] scanning {domain}")
    if not session:
        return

    insert_stmt = session.prepare(
        "INSERT INTO domain_discovery.dns_records (domain, record_type, record_value, scan_date) VALUES (?, ?, ?, ?)"
    )

    def save(rtype: str, value: str) -> None:
        params = (domain, rtype, value, datetime.utcnow())
        _safe_execute(session, insert_stmt, params)

    record_types = ["A", "AAAA", "MX", "NS", "TXT"]
    for rtype in record_types:
        try:
            answers = dns.resolver.resolve(domain, rtype, lifetime=10)
            for rdata in answers:
                text = rdata.to_text()
                save(rtype, text)
                if rtype == "TXT" and text.strip('"').lower().startswith("v=spf1"):
                    save("SPF", text)
        except Exception:
            continue

    dmarc_domain = f"_dmarc.{domain}"
    try:
        answers = dns.resolver.resolve(dmarc_domain, "TXT", lifetime=10)
        for rdata in answers:
            save("DMARC", rdata.to_text())
    except Exception:
        pass


def tech_scan(domain: str, session: Any) -> None:
    print(f"[TECH] scanning {domain}")


def lighthouse_scan(domain: str, session: Any) -> None:
    """Run Lighthouse audits using the AutoLighthouse worker."""
    print(f"[Lighthouse] scanning {domain}")
    script = os.path.join(
        os.path.dirname(__file__), "AutoLighthouse", "index.js"
    )
    url = f"http://{domain}"
    env = os.environ.copy()
    try:
        subprocess.run(
            ["node", script, "run", "--url", url, "--cassandra"],
            check=True,
            env=env,
        )
    except FileNotFoundError:
        print("AutoLighthouse script not found")
    except subprocess.CalledProcessError as exc:
        print(f"Lighthouse scan failed: {exc}")


def carbon_scan(domain: str, session: Any) -> None:
    print(f"[Carbon] scanning {domain}")
    script = os.path.join(os.path.dirname(__file__), "..", "BACKEND-CarbonAuditor", "index.js")
    url = f"http://{domain}"
    try:
        subprocess.run(["node", script, url], check=True)
    except FileNotFoundError:
        print("Carbon audit script not found")
    except subprocess.CalledProcessError as exc:
        print(f"Carbon audit failed: {exc}")


def analytics_scan(domain: str, session: Any) -> None:
    print(f"[Analytics] scanning {domain}")


def webpagetest_scan(domain: str, session: Any) -> None:
    print(f"[WebPageTest] scanning {domain}")


def enrich_scan(domain: str, session: Any) -> None:
    """Run the enrichment logic from WORKER-Enrich_processed_domains."""
    if not analyze_target:
        print("Enrichment dependencies not available")
        return
    result = analyze_target(domain)
    print(json.dumps(result, indent=2))
    _update_enrichment(session, domain, result)


# Mapping of test group name to function
TESTS: Dict[str, Callable[[str, Any], None]] = {
    "ssl": ssl_scan,
    "whois": whois_scan,
    "dns": dns_scan,
    "tech": tech_scan,
    "lighthouse": lighthouse_scan,
    "carbon": carbon_scan,
    "analytics": analytics_scan,
    "webpagetest": webpagetest_scan,
    "enrich": enrich_scan,
}


def run_scans(domain: str, tests: List[str], session: Any) -> None:
    for name in tests:
        func = TESTS.get(name)
        if not func:
            print(f"Unknown test: {name}")
            continue
        func(domain, session)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Medusa scanning engine")
    parser.add_argument("--domain", required=True, help="Target domain")
    parser.add_argument("--tests", help="Comma separated list of tests to run")
    parser.add_argument("--all", action="store_true", help="Run all available tests")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.all:
        tests = list(TESTS.keys())
    elif args.tests:
        tests = [t.strip() for t in args.tests.split(",") if t.strip()]
    else:
        print("No tests specified. Use --all or --tests.")
        return

    cluster, session = _cassandra_session()
    try:
        run_scans(args.domain, tests, session)
    finally:
        cluster.shutdown()


if __name__ == "__main__":
    main()
