#!/usr/bin/env python3
"""Medusa all-in-one scanner.

This script orchestrates multiple scanning modules. It can run a full
crawl or execute a subset of scans. Each scan should populate the
columns outlined in db_schema.md.
"""

import argparse
import csv
import json
import logging
import os
import random
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Any, Callable, Dict, List, Tuple

if sys.version_info >= (3, 12):
    sys.exit(
        "Medusa currently requires Python 3.11 or earlier due to cassandra-driver compatibility."
    )

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

# Import the lightweight recon modules bundled under scans
from scans.open_ports import run_test as open_ports_test
from scans.http_methods import run_test as http_methods_test
from scans.waf_detection import run_test as waf_detection_test
from scans.directory_enumeration import run_test as dir_enum_test
from scans.certificate_details import run_test as cert_details_test
from scans.meta_tags import run_test as meta_tags_test
from scans.compare_sitemaps_robots import run_test as sitemaps_robots_test
from scans.cookie_settings import run_test as cookie_settings_test
from scans.external_resources import run_test as external_resources_test
from scans.passive_subdomains import run_test as subdomains_test
from scans.whois import run_test as whois_test
from scans.dns_enumeration import run_test as dns_enum_test
from scans.webpagetest import run_test as webpagetest_test
from scans.full_page_screenshot import run_test as screenshot_test
from scans.contrast_heatmap import run_test as heatmap_test
from scans.google_maps import run_test as google_maps_test
from bs4 import BeautifulSoup
import requests
from urllib.parse import urljoin, urlparse

# Configure logging
logging.basicConfig(
    level=os.environ.get("MEDUSA_LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

# Reuse a single HTTP session across scans
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "MedusaScanner/1.0"})


@dataclass
class PageMetrics:
    status_code: int | None = None
    redirect_chain: List[str] = field(default_factory=list)
    page_load_time_ms: int | None = None
    broken_links_count: int = 0
    internal_links_count: int = 0
    external_links_count: int = 0
    page_images_count: int = 0
    missing_alt_text_images_count: int = 0
    iframe_embeds_count: int = 0
    video_embeds_count: int = 0
    duplicate_meta_titles: bool = False
    duplicate_meta_descriptions: bool = False
    emails: List[str] = field(default_factory=list)
    phone_numbers: List[str] = field(default_factory=list)
    sms_numbers: List[str] = field(default_factory=list)
    addresses: List[str] = field(default_factory=list)

# Development mode flag. When enabled results are written to a CSV file
# instead of Cassandra for easier testing.
DEV_MODE = False
# Path to the CSV file used when DEV_MODE is active
CSV_PATH = os.path.join(os.path.dirname(__file__), "dev_results.csv")

# Use the bundled enrichment module so this worker is self contained
try:
    from enrichment import (
        analyze_target,
        is_domain_up,
        extract_contact_details,
        analyze_tech,
    )
except Exception:  # pragma: no cover - optional dependency
    analyze_target = None
    is_domain_up = None
    extract_contact_details = None
    analyze_tech = None

# Helper functions for Cassandra integration


def _safe_execute(session: Any, query: str, params: Tuple[Any, ...]):
    """Execute a Cassandra query with basic retry logic."""
    delay = int(os.environ.get("MEDUSA_CASSANDRA_RETRY_DELAY", "5"))
    max_delay = int(os.environ.get("MEDUSA_CASSANDRA_MAX_DELAY", "60"))
    retried_for_lists = False
    while True:
        try:
            return session.execute(query, params)
        except (
            OperationTimedOut,
            Unavailable,
            WriteTimeout,
            ReadTimeout,
        ) as e:
            logger.warning(
                "Cassandra error (%s): %s. Retrying in %ss...",
                type(e).__name__,
                e,
                delay,
            )
            time.sleep(delay + random.uniform(0, delay))
            delay = min(delay * 2, max_delay)
        except AttributeError as e:
            # Older schema versions stored collection columns as text. If we
            # attempt to bind a list value to such a column the driver raises
            # an AttributeError when encoding the parameter. Fallback to JSON
            # encoding the list values and retry once for compatibility.
            if not retried_for_lists and "encode" in str(e):
                params = tuple(
                    json.dumps(p) if isinstance(p, list) else p for p in params
                )
                retried_for_lists = True
                continue
            raise


def _write_csv(table: str, key: str, data: Dict[str, Any]) -> None:
    """Append a row to the dev CSV file."""
    headers = ["timestamp", "table", "key", "data"]
    row = [datetime.utcnow().isoformat(), table, key, json.dumps(data)]
    exists = os.path.exists(CSV_PATH)
    with open(CSV_PATH, "a", newline="") as fh:
        writer = csv.writer(fh)
        if not exists:
            writer.writerow(headers)
        writer.writerow(row)



def _cassandra_session() -> Tuple[Cluster | None, Any | None]:
    """Return a Cassandra Cluster and Session configured via environment."""
    if DEV_MODE:
        return None, None
    hosts_str = os.environ.get(
        "MEDUSA_CASSANDRA_HOSTS",
        os.environ.get(
            "CASSANDRA_URL",
            "192.168.1.201,192.168.1.202,192.168.1.203,192.168.1.204",
        ),
    )
    hosts = [h.strip() for h in hosts_str.split(",") if h.strip()]
    port = int(os.environ.get("MEDUSA_CASSANDRA_PORT", "9042"))
    keyspace = os.environ.get(
        "MEDUSA_CASSANDRA_KEYSPACE",
        os.environ.get("CASSANDRA_KEYSPACE", "domain_discovery"),
    )
    local_dc = os.environ.get("MEDUSA_CASSANDRA_DC", "datacenter1")
    cluster = Cluster(
        contact_points=hosts,
        port=port,
        load_balancing_policy=DCAwareRoundRobinPolicy(local_dc=local_dc),
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
        if DEV_MODE:
            _write_csv("domains_processed", domain, data)
        return
    ext = extract(domain)
    dom = ext.domain.strip().strip(".")
    tld = ext.suffix.strip().strip(".")

    # Normalize list columns to avoid type errors when a single string is
    # provided. Cassandra expects list<text> for these fields.
    list_fields = ["emails", "phone_numbers", "sms_numbers", "addresses"]
    for field in list_fields:
        if field in data:
            value = data[field]
            if value is None or value == "":
                data[field] = []
            elif isinstance(value, set):
                data[field] = list(value)
            elif not isinstance(value, list):
                data[field] = [value]

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
            phone_numbers = ?,
            sms_numbers = ?,
            addresses = ?,
            favicon_url = ?,
            robots_txt_exists = ?,
            robots_txt_content = ?,
            canonical_url = ?,
            h1_count = ?,
            h2_count = ?,
            h3_count = ?,
            schema_markup_detected = ?,
            schema_types = ?,
            security_headers_score = ?,
            security_headers_detected = ?,
            hsts_enabled = ?,
            cookie_compliance = ?,
            third_party_scripts = ?,
            color_contrast_issues = ?,
            aria_landmark_count = ?,
            form_accessibility_issues = ?,
            social_media_profiles = ?,
            rss_feed_detected = ?,
            newsletter_signup_detected = ?,
            cdn_detected = ?,
            http_version = ?,
            compression_enabled = ?,
            cache_control_headers = ?,
            page_weight_bytes = ?,
            main_language = ?,
            content_keywords = ?,
            ecommerce_platforms = ?,
            sitemap_page_count = ?,
            meta_tag_count = ?,
            sitemap_robots_conflict = ?,
            insecure_cookie_count = ?,
            external_resource_count = ?,
            passive_subdomain_count = ?,
            open_ports = ?,
            allowed_http_methods = ?,
            waf_name = ?,
            directory_scan = ?,
            certificate_info = ?,
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

    def norm(value: Any) -> Any:
        """Serialize dictionaries but keep lists intact for Cassandra."""
        if isinstance(value, dict):
            return json.dumps(value)
        return value

    params = (
        bool(data.get("status", True)),
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
        norm(data.get("languages", [])),
        float(data.get("lat", 0.0)),
        float(data.get("lon", 0.0)),
        str(data.get("org", "")),
        str(data.get("phone", "")),
        str(data.get("region", "")),
        str(data.get("regionName", "")),
        str(data.get("registered", "")),
        str(data.get("registrar", "")),
        str(data.get("ssl_issuer", "")),
        str(data.get("ssl_org", "")),
        str(data.get("x_powered_by", "")),
        norm(data.get("tech_detect", [])),
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
        norm(data.get("emails", [])),
        norm(data.get("phone_numbers", [])),
        norm(data.get("sms_numbers", [])),
        norm(data.get("addresses", [])),
        str(data.get("favicon_url", "")),
        bool(data.get("robots_txt_exists", False)),
        str(data.get("robots_txt_content", "")),
        str(data.get("canonical_url", "")),
        int(data.get("h1_count", 0)),
        int(data.get("h2_count", 0)),
        int(data.get("h3_count", 0)),
        bool(data.get("schema_markup_detected", False)),
        norm(data.get("schema_types", [])),
        int(data.get("security_headers_score", 0)),
        norm(data.get("security_headers_detected", [])),
        bool(data.get("hsts_enabled", False)),
        bool(data.get("cookie_compliance", False)),
        int(data.get("third_party_scripts", 0)),
        int(data.get("color_contrast_issues", 0)),
        int(data.get("aria_landmark_count", 0)),
        int(data.get("form_accessibility_issues", 0)),
        norm(data.get("social_media_profiles", [])),
        bool(data.get("rss_feed_detected", False)),
        bool(data.get("newsletter_signup_detected", False)),
        bool(data.get("cdn_detected", False)),
        str(data.get("http_version", "")),
        bool(data.get("compression_enabled", False)),
        str(data.get("cache_control_headers", "")),
        int(data.get("page_weight_bytes", 0)),
        str(data.get("main_language", "")),
        str(data.get("content_keywords", "")),
        norm(data.get("ecommerce_platforms", [])),
        int(data.get("sitemap_page_count", 0)),
        int(data.get("meta_tag_count", 0)),
        bool(data.get("sitemap_robots_conflict", False)),
        int(data.get("insecure_cookie_count", 0)),
        int(data.get("external_resource_count", 0)),
        int(data.get("passive_subdomain_count", 0)),
        json.dumps(data.get("open_ports", [])),
        json.dumps(data.get("allowed_http_methods", [])),
        str(data.get("waf_name", "")),
        str(data.get("directory_scan", "")),
        str(data.get("certificate_info", "")),
        now_str,
        dom,
        tld,
    )

    _safe_execute(session, update_stmt, params)


def _update_page_metrics(session, url: str, data: Dict[str, Any]) -> None:
    """Insert per-page metrics into domain_page_metrics."""
    if not session:
        if DEV_MODE:
            _write_csv("domain_page_metrics", url, data)
        return
    parts = urlparse(url)
    dom = parts.hostname or ""
    ext = extract(dom)
    domain = ext.domain.strip().strip(".")
    tld = ext.suffix.strip().strip(".")
    columns = ["domain", "url", "scan_date"] + list(data.keys())
    placeholders = ", ".join(["?"] * len(columns))
    query = f"INSERT INTO domain_discovery.domain_page_metrics ({', '.join(columns)}) VALUES ({placeholders})"
    stmt = session.prepare(query)
    values = [domain, url, datetime.utcnow()] + list(data.values())
    _safe_execute(session, stmt, tuple(values))


def _insert_business(session, data: Dict[str, Any]) -> None:
    """Insert a business row into the businesses table."""
    if not session:
        if DEV_MODE:
            _write_csv("businesses", data.get("website", ""), data)
        return
    query = (
        "INSERT INTO domain_discovery.businesses "
        "(name, address, website, phone, reviews_average, query, latitude, longitude) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    stmt = session.prepare(query)
    params = (
        data.get("name"),
        data.get("address"),
        data.get("website"),
        data.get("phone"),
        float(data.get("reviews_average", 0)),
        data.get("query"),
        float(data.get("latitude", 0)),
        float(data.get("longitude", 0)),
    )
    _safe_execute(session, stmt, params)


def _insert_analytics(session, data: Dict[str, Any]) -> None:
    """Insert analytics tag scan results."""
    if not session:
        if DEV_MODE:
            _write_csv("analytics_tag_health", data.get("domain", ""), data)
        return
    query = (
        "INSERT INTO domain_discovery.analytics_tag_health "
        "(domain, scan_date, working_variants, scanned_urls, "
        "found_analytics, page_results, variant_results, compliance_status) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    stmt = session.prepare(query)
    params = (
        data.get("domain"),
        datetime.utcnow(),
        data.get("working_variants", []),
        data.get("scanned_urls", []),
        {k: json.dumps(v) for k, v in data.get("found_analytics", {}).items()},
        {k: json.dumps(v) for k, v in data.get("page_results", {}).items()},
        {k: json.dumps(v) for k, v in data.get("variant_results", {}).items()},
        data.get("compliance_status"),
    )
    _safe_execute(session, stmt, params)


def check_site_variants(domain: str) -> Tuple[str | None, List[str], str | None, int, int]:
    """Return reachable URL plus redirect chain and HTML.

    The function fetches the homepage once and returns the response body along
    with the status code and load time so other scans can reuse the data.
    """
    variants = [
        f"https://{domain}",
        f"http://{domain}",
        f"https://www.{domain}",
        f"http://www.{domain}",
    ]
    for url in variants:
        try:
            start = time.time()
            resp = SESSION.get(url, timeout=10, allow_redirects=True)
            load_ms = int((time.time() - start) * 1000)
            if resp.status_code < 400:
                chain = [r.headers.get("Location", r.url) for r in resp.history]
                if chain:
                    chain.append(resp.url)
                return resp.url, chain, resp.text, resp.status_code, load_ms
        except requests.RequestException:
            continue
    return None, [], None, 0, 0


def scan_page_url(
    url: str,
    session: Any,
    html: str | None = None,
    status_code: int | None = None,
    load_time_ms: int | None = None,
    redirect_chain: List[str] | None = None,
) -> Dict[str, Any]:
    """Collect metrics for a single page URL and return the data.

    If ``html`` is provided, the function skips fetching the page and only
    performs parsing and link checks. This allows callers to reuse a previously
    retrieved page body.
    """
    metrics = PageMetrics()
    try:
        if html is None:
            start = time.time()
            response = SESSION.get(url, timeout=15, allow_redirects=True)
            status_code = response.status_code
            redirect_chain = [r.headers.get("Location", r.url) for r in response.history]
            if redirect_chain:
                redirect_chain.append(response.url)
            load_time_ms = int((time.time() - start) * 1000)
            html = response.text
        metrics.status_code = status_code
        metrics.redirect_chain = redirect_chain or []
        if load_time_ms is not None:
            metrics.page_load_time_ms = load_time_ms
        soup = BeautifulSoup(html or "", "html.parser")

        anchors = soup.find_all("a")
        internal = external = broken = 0
        for a in anchors[:50]:
            href = a.get("href")
            if not href:
                continue
            full = urljoin(url, href)
            parsed = urlparse(full)
            if parsed.netloc and parsed.netloc != urlparse(url).netloc:
                external += 1
            else:
                internal += 1
            try:
                head = SESSION.head(full, timeout=5, allow_redirects=True)
                if head.status_code >= 400:
                    broken += 1
            except requests.RequestException:
                broken += 1
        metrics.broken_links_count = broken
        metrics.internal_links_count = internal
        metrics.external_links_count = external

        images = soup.find_all("img")
        metrics.page_images_count = len(images)
        metrics.missing_alt_text_images_count = sum(
            1 for img in images if not img.get("alt")
        )

        iframes = soup.find_all("iframe")
        videos = soup.find_all("video")
        for iframe in iframes:
            src = iframe.get("src", "")
            if "youtube" in src or "vimeo" in src:
                videos.append(iframe)
        metrics.iframe_embeds_count = len(iframes)
        metrics.video_embeds_count = len(videos)

        titles = soup.find_all("title")
        metas = soup.find_all("meta", attrs={"name": "description"})
        metrics.duplicate_meta_titles = len(titles) > 1
        metrics.duplicate_meta_descriptions = len(metas) > 1

        if extract_contact_details:
            contacts = extract_contact_details(html or "")
            if contacts["emails"]:
                metrics.emails = contacts["emails"]
            if contacts["phone_numbers"]:
                metrics.phone_numbers = contacts["phone_numbers"]
            if contacts["sms_numbers"]:
                metrics.sms_numbers = contacts["sms_numbers"]
            if contacts["addresses"]:
                metrics.addresses = contacts["addresses"]
    except requests.RequestException as exc:  # pragma: no cover - best effort
        logger.error("page fetch error: %s", exc)
    except Exception as exc:  # pragma: no cover - best effort
        logger.error("page metrics error: %s", exc)

    metrics_dict = asdict(metrics)
    if any(value for value in metrics_dict.values() if value):
        _update_page_metrics(session, url, metrics_dict)

    return metrics_dict


def crawl_site(start_url: str, session: Any, max_pages: int = 20) -> None:
    """Crawl the site starting at start_url and scan each page."""
    visited = set()
    queue = [start_url]
    phones: set[str] = set()
    emails: set[str] = set()
    sms: set[str] = set()
    addresses: set[str] = set()
    while queue and len(visited) < max_pages:
        url = queue.pop(0)
        if url in visited:
            continue
        visited.add(url)
        page_data = scan_page_url(url, session)
        phones.update(page_data.get("phone_numbers", []))
        emails.update(page_data.get("emails", []))
        sms.update(page_data.get("sms_numbers", []))
        addresses.update(page_data.get("addresses", []))
        try:
            resp = SESSION.get(url, timeout=10)
            soup = BeautifulSoup(resp.text, "html.parser")
            for a in soup.find_all("a"):
                href = a.get("href")
                if not href:
                    continue
                full = urljoin(url, href)
                if urlparse(full).netloc != urlparse(start_url).netloc:
                    continue
                full = full.split("#")[0]
                if full not in visited and full not in queue:
                    queue.append(full)
        except requests.RequestException:
            continue

    agg: Dict[str, Any] = {}
    if phones:
        agg["phone_numbers"] = sorted(phones)
    if emails:
        agg["emails"] = sorted(emails)
    if sms:
        agg["sms_numbers"] = sorted(sms)
    if addresses:
        agg["addresses"] = sorted(addresses)
    if agg:
        _update_enrichment(session, urlparse(start_url).hostname or start_url, agg)


# Placeholder scan functions. Real implementations should invoke the
# dedicated workers or libraries that perform each scan.


def ssl_scan(domain: str, session: Any) -> None:
    """Run SSL certificate checks."""
    logger.info("[SSL] scanning %s", domain)
    try:
        info = cert_details_test(domain)
        _update_enrichment(session, domain, {"certificate_info": info})
    except Exception as exc:  # pragma: no cover - best effort
        logger.error("ssl scan error: %s", exc)


def whois_scan(domain: str, session: Any) -> None:
    """Perform WHOIS lookup and store basic info."""
    logger.info("[WHOIS] scanning %s", domain)
    try:
        output = whois_test(domain)
        data: Dict[str, Any] = {}
        for line in output.splitlines():
            if "Registrar:" in line:
                data["registrar"] = line.split(":", 1)[-1].strip()
            if "Creation Date:" in line or "Registered On:" in line:
                data["registered"] = line.split(":", 1)[-1].strip()
        if data:
            _update_enrichment(session, domain, data)
    except Exception as exc:  # pragma: no cover - best effort
        logger.error("whois scan error: %s", exc)


def dns_scan(domain: str, session: Any) -> None:
    """Gather common DNS records for the domain."""
    logger.info("[DNS] scanning %s", domain)
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
    """Detect site technology and update enrichment."""
    logger.info("[TECH] scanning %s", domain)
    if not analyze_tech:
        logger.error("analyze_tech dependency not available")
        return
    try:
        tech = analyze_tech(domain)
        if tech:
            _update_enrichment(session, domain, {"tech_detect": tech})
    except Exception as exc:  # pragma: no cover - best effort
        logger.error("tech scan error: %s", exc)


def lighthouse_scan(domain: str, session: Any) -> None:
    """Run Lighthouse audits using the AutoLighthouse worker."""
    logger.info("[Lighthouse] scanning %s", domain)
    script = os.path.join(os.path.dirname(__file__), "AutoLighthouse", "index.js")
    url = f"http://{domain}"
    env = os.environ.copy()
    try:
        subprocess.run(
            ["node", script, "run", "--url", url, "--cassandra"],
            check=True,
            env=env,
        )
    except FileNotFoundError:
        logger.error("AutoLighthouse script not found")
    except subprocess.CalledProcessError as exc:
        logger.error("Lighthouse scan failed: %s", exc)


def carbon_scan(domain: str, session: Any) -> None:
    """Run carbon footprint audit via the Node script."""
    logger.info("[Carbon] scanning %s", domain)
    script = os.path.join(
        os.path.dirname(__file__), "..", "BACKEND-CarbonAuditor", "index.js"
    )
    url = f"http://{domain}"
    try:
        subprocess.run(["node", script, url], check=True)
    except FileNotFoundError:
        logger.error("Carbon audit script not found")
    except subprocess.CalledProcessError as exc:
        logger.error("Carbon audit failed: %s", exc)


def analytics_scan(domain: str, session: Any, html: str | None = None) -> None:
    """Check for common analytics tags on the homepage.

    When ``html`` is provided the function avoids fetching the page again.
    """
    logger.info("[Analytics] scanning %s", domain)
    url = f"http://{domain}"
    try:
        if html is None:
            resp = SESSION.get(url, timeout=10)
            html = resp.text
        found = {}
        if "googletagmanager.com" in html or "gtag/js" in html:
            found["google_tag_manager"] = True
        if "google-analytics.com" in html:
            found["google_analytics"] = True
        row = {
            "domain": domain,
            "working_variants": [url],
            "scanned_urls": [url],
            "found_analytics": found,
            "page_results": {},
            "variant_results": {},
            "compliance_status": "found" if found else "missing",
        }
        _insert_analytics(session, row)
    except requests.RequestException as exc:  # pragma: no cover - best effort
        logger.error("analytics scan error: %s", exc)


def webpagetest_scan(domain: str, session: Any) -> None:
    logger.info("[WebPageTest] scanning %s", domain)
    try:
        output = webpagetest_test(
            f"https://{domain}",
            api_key=os.environ.get("WEBPAGETEST_API_KEY"),
            verbose=False,
        )
        metrics: Dict[str, Any] = {}
        for line in output.splitlines():
            if line.startswith("Load Time:"):
                metrics["wpt_load_time_ms"] = int(
                    line.split(":", 1)[1].strip().rstrip("ms")
                )
            elif line.startswith("Speed Index:"):
                metrics["wpt_speed_index"] = float(line.split(":", 1)[1].strip())
            elif line.startswith("TTFB:"):
                metrics["wpt_ttfb_ms"] = int(line.split(":", 1)[1].strip())
        if metrics:
            _update_page_metrics(session, f"https://{domain}", metrics)
    except Exception as exc:  # pragma: no cover - best effort
        logger.error("webpagetest error: %s", exc)


def screenshot_scan(
    domain: str,
    session: Any,
    page: str = "/",
    cache: Dict[str, Any] | None = None,
) -> str | None:
    """Capture a screenshot of the landing page or provided path."""
    target = f"{domain}{page}".rstrip("/") if page.startswith("/") else page
    logger.info("[Screenshot] capturing %s", target)
    try:
        path = screenshot_test(target)
        _update_page_metrics(session, f"https://{target}", {"screenshot_path": path})
        if cache is not None:
            cache["screenshot"] = path
        return path
    except Exception as exc:  # pragma: no cover - best effort
        logger.error("screenshot error: %s", exc)
    return None


def heatmap_scan(domain: str, session: Any, cache: Dict[str, Any] | None = None) -> None:
    """Generate a contrast heatmap for the homepage."""
    logger.info("[Heatmap] generating for %s", domain)
    try:
        if cache and cache.get("screenshot"):
            shot = cache["screenshot"]
        else:
            shot = screenshot_test(domain)
            if cache is not None:
                cache["screenshot"] = shot
        path = heatmap_test(shot)
        _update_page_metrics(session, f"https://{domain}", {"heatmap_path": path})
    except Exception as exc:  # pragma: no cover - best effort
        logger.error("heatmap error: %s", exc)


def google_maps_scan(domain: str, session: Any) -> None:
    """Scrape Google Maps business info."""
    logger.info("[GoogleMaps] scanning %s", domain)
    try:
        result = google_maps_test(domain)
        info = json.loads(result)
        _insert_business(session, info)
    except Exception as exc:  # pragma: no cover - best effort
        logger.error("google maps error: %s", exc)


def initial_recon_scan(domain: str, session: Any) -> None:
    """Run the bundled passive recon tests and store results."""
    logger.info("[Recon] scanning %s", domain)
    data: Dict[str, Any] = {}

    try:
        output = open_ports_test(domain, verbose=False)
        ports = []
        for line in output.splitlines():
            if "OPEN" in line:
                try:
                    parts = line.split()
                    port = int(parts[1])
                    ports.append(port)
                except Exception:
                    continue
        if ports:
            data["open_ports"] = ports
    except Exception as exc:  # pragma: no cover - best effort
        logger.error("open ports error: %s", exc)

    try:
        output = http_methods_test(domain, verbose=False)
        if "Allowed Methods" in output:
            methods_part = output.split(":", 1)[-1]
            methods = [m.strip() for m in methods_part.split(" ") if m.strip()]
            data["allowed_http_methods"] = methods
    except Exception as exc:  # pragma: no cover - best effort
        logger.error("http methods error: %s", exc)

    try:
        output = waf_detection_test(domain)
        for line in output.splitlines():
            if line.startswith("Detected WAF(s):"):
                wafs = line.split(":", 1)[-1]
                data["waf_name"] = wafs.strip()
                break
    except Exception as exc:  # pragma: no cover - best effort
        logger.error("waf detection error: %s", exc)

    try:
        data["directory_scan"] = dir_enum_test(domain, verbose=False)
    except Exception as exc:  # pragma: no cover - best effort
        logger.error("directory enumeration error: %s", exc)

    try:
        data["certificate_info"] = cert_details_test(domain)
    except Exception as exc:  # pragma: no cover - best effort
        logger.error("certificate details error: %s", exc)

    try:
        output = meta_tags_test(f"https://{domain}", verbose=False)
        for line in output.splitlines():
            if line.lower().startswith("total meta tags found:"):
                num = line.split(":", 1)[-1].strip()
                data["meta_tag_count"] = int(num)
                break
    except Exception as exc:  # pragma: no cover - best effort
        logger.error("meta tags error: %s", exc)

    try:
        output = sitemaps_robots_test(domain, verbose=False)
        if "Discrepancies found" in output:
            data["sitemap_robots_conflict"] = True
        elif "No discrepancies" in output:
            data["sitemap_robots_conflict"] = False
    except Exception as exc:  # pragma: no cover - best effort
        logger.error("sitemap/robots error: %s", exc)

    try:
        output = cookie_settings_test(domain, verbose=False)
        sections = output.split("Cookie:")
        insecure = 0
        for section in sections[1:]:
            if "- Secure: No" in section or "- HttpOnly: No" in section:
                insecure += 1
        if insecure:
            data["insecure_cookie_count"] = insecure
    except Exception as exc:  # pragma: no cover - best effort
        logger.error("cookie settings error: %s", exc)

    try:
        output = external_resources_test(f"https://{domain}", verbose=False)
        total = 0
        for line in output.splitlines():
            if "Total Found:" in line:
                try:
                    part = line.split("Total Found:", 1)[1]
                    num = int(part.split(")", 1)[0].strip())
                    total += num
                except Exception:
                    continue
        if total:
            data["external_resource_count"] = total
    except Exception as exc:  # pragma: no cover - best effort
        logger.error("external resources error: %s", exc)

    try:
        output = subdomains_test(domain, verbose=False)
        for line in output.splitlines():
            if line.startswith("Total Unique Subdomains Found:"):
                num = line.split(":", 1)[-1].strip()
                data["passive_subdomain_count"] = int(num)
                break
    except Exception as exc:  # pragma: no cover - best effort
        logger.error("subdomain gathering error: %s", exc)

    if data:
        _update_enrichment(session, domain, data)


def page_metrics_scan(
    domain: str,
    session: Any,
    html: str | None = None,
    status_code: int | None = None,
    load_time_ms: int | None = None,
    redirect_chain: List[str] | None = None,
) -> None:
    """Gather basic metrics for the site's homepage."""
    logger.info("[PageMetrics] scanning %s", domain)
    url = f"https://{domain}"
    scan_page_url(
        url,
        session,
        html=html,
        status_code=status_code,
        load_time_ms=load_time_ms,
        redirect_chain=redirect_chain,
    )


def enrich_scan(domain: str, session: Any) -> None:
    """Run the enrichment logic from WORKER-Enrich_processed_domains."""
    if not analyze_target:
        logger.error("Enrichment dependencies not available")
        return
    result = analyze_target(domain)
    logger.info(json.dumps(result, indent=2))
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
    "screenshot": screenshot_scan,
    "heatmap": heatmap_scan,
    "maps": google_maps_scan,
    "enrich": enrich_scan,
    "recon": initial_recon_scan,
    "page": page_metrics_scan,
}


def run_scans(domain: str, tests: List[str], session: Any) -> None:
    """Execute the selected scan functions for a domain."""
    url, redirects, html, status_code, load_ms = check_site_variants(domain)
    if not url:
        logger.error("Domain not reachable")
        _update_enrichment(session, domain, {"status": False})
        return

    _update_enrichment(session, domain, {"status": True, "canonical_url": url})
    if redirects:
        _update_page_metrics(session, url, {"redirect_chain": redirects})

    canonical = urlparse(url).hostname or domain

    cache = {
        "html": html,
        "status_code": status_code,
        "load_time_ms": load_ms,
        "redirect_chain": redirects,
    }

    futures = []
    with ThreadPoolExecutor(max_workers=len(tests)) as executor:
        for name in tests:
            if name == "page":
                crawl_site(url, session)
                continue
            func = TESTS.get(name)
            if not func:
                logger.warning("Unknown test: %s", name)
                continue
            if name == "analytics":
                futures.append(executor.submit(func, canonical, session, cache.get("html")))
            elif name == "screenshot":
                futures.append(executor.submit(func, canonical, session, "/", cache))
            elif name == "heatmap":
                futures.append(executor.submit(func, canonical, session, cache))
            else:
                futures.append(executor.submit(func, canonical, session))

        for f in as_completed(futures):
            try:
                f.result()
            except Exception as exc:  # pragma: no cover - best effort
                logger.error("scan failed: %s", exc)


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Medusa scanning engine")
    parser.add_argument("--domain", required=True, help="Target domain")
    parser.add_argument("--tests", help="Comma separated list of tests to run")
    parser.add_argument("--all", action="store_true", help="Run all available tests")
    parser.add_argument(
        "--dev",
        action="store_true",
        help="Write results to CSV instead of Cassandra",
    )
    return parser.parse_args()


def main() -> None:
    """Entry point for the Medusa worker."""
    args = parse_args()
    global DEV_MODE
    DEV_MODE = args.dev
    if args.all:
        tests = list(TESTS.keys())
    elif args.tests:
        tests = [t.strip() for t in args.tests.split(",") if t.strip()]
    else:
        logger.error("No tests specified. Use --all or --tests.")
        return

    cluster, session = _cassandra_session()
    try:
        run_scans(args.domain, tests, session)
    finally:
        if cluster:
            cluster.shutdown()


if __name__ == "__main__":
    main()
