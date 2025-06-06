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

# Import the lightweight recon modules bundled under tests
from tests.test_open_ports import run_test as open_ports_test
from tests.test_http_methods import run_test as http_methods_test
from tests.test_waf_detection import run_test as waf_detection_test
from tests.test_directory_enumeration import run_test as dir_enum_test
from tests.test_certificate_details import run_test as cert_details_test
from tests.test_meta_tags import run_test as meta_tags_test
from tests.test_compare_sitemaps_robots import run_test as sitemaps_robots_test
from tests.test_cookie_settings import run_test as cookie_settings_test
from tests.test_external_resources import run_test as external_resources_test
from tests.test_passive_subdomains import run_test as subdomains_test
from tests.test_whois import run_test as whois_test
from tests.test_dns_enumeration import run_test as dns_enum_test
from tests.test_webpagetest import run_test as webpagetest_test
from tests.test_full_page_screenshot import run_test as screenshot_test
from tests.test_contrast_heatmap import run_test as heatmap_test
from tests.test_google_maps import run_test as google_maps_test
from bs4 import BeautifulSoup
import requests
from urllib.parse import urljoin, urlparse

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
        str(data.get("favicon_url", "")),
        bool(data.get("robots_txt_exists", False)),
        str(data.get("robots_txt_content", "")),
        str(data.get("canonical_url", "")),
        int(data.get("h1_count", 0)),
        int(data.get("h2_count", 0)),
        int(data.get("h3_count", 0)),
        bool(data.get("schema_markup_detected", False)),
        json.dumps(data.get("schema_types", [])),
        int(data.get("security_headers_score", 0)),
        json.dumps(data.get("security_headers_detected", [])),
        bool(data.get("hsts_enabled", False)),
        bool(data.get("cookie_compliance", False)),
        int(data.get("third_party_scripts", 0)),
        int(data.get("color_contrast_issues", 0)),
        int(data.get("aria_landmark_count", 0)),
        int(data.get("form_accessibility_issues", 0)),
        json.dumps(data.get("social_media_profiles", [])),
        bool(data.get("rss_feed_detected", False)),
        bool(data.get("newsletter_signup_detected", False)),
        bool(data.get("cdn_detected", False)),
        str(data.get("http_version", "")),
        bool(data.get("compression_enabled", False)),
        str(data.get("cache_control_headers", "")),
        int(data.get("page_weight_bytes", 0)),
        str(data.get("main_language", "")),
        str(data.get("content_keywords", "")),
        json.dumps(data.get("ecommerce_platforms", [])),
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


def check_site_variants(domain: str) -> Tuple[str | None, List[str]]:
    """Return reachable URL and redirect chain for common variants."""
    variants = [
        f"https://{domain}",
        f"http://{domain}",
        f"https://www.{domain}",
        f"http://www.{domain}",
    ]
    for url in variants:
        try:
            resp = requests.get(url, timeout=10, allow_redirects=True)
            if resp.status_code < 400:
                chain = [r.headers.get("Location", r.url) for r in resp.history]
                if chain:
                    chain.append(resp.url)
                return resp.url, chain
        except Exception:
            continue
    return None, []


def scan_page_url(url: str, session: Any) -> None:
    """Collect metrics for a single page URL."""
    data: Dict[str, Any] = {}
    try:
        start = time.time()
        response = requests.get(url, timeout=15, allow_redirects=True)
        data["status_code"] = response.status_code
        chain = [r.headers.get("Location", r.url) for r in response.history]
        if chain:
            chain.append(response.url)
        data["redirect_chain"] = chain
        data["page_load_time_ms"] = int((time.time() - start) * 1000)
        soup = BeautifulSoup(response.text, "html.parser")

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
                head = requests.head(full, timeout=5, allow_redirects=True)
                if head.status_code >= 400:
                    broken += 1
            except Exception:
                broken += 1
        data["broken_links_count"] = broken
        data["internal_links_count"] = internal
        data["external_links_count"] = external

        images = soup.find_all("img")
        data["page_images_count"] = len(images)
        data["missing_alt_text_images_count"] = sum(1 for img in images if not img.get("alt"))

        iframes = soup.find_all("iframe")
        videos = soup.find_all("video")
        for iframe in iframes:
            src = iframe.get("src", "")
            if "youtube" in src or "vimeo" in src:
                videos.append(iframe)
        data["iframe_embeds_count"] = len(iframes)
        data["video_embeds_count"] = len(videos)

        titles = soup.find_all("title")
        metas = soup.find_all("meta", attrs={"name": "description"})
        data["duplicate_meta_titles"] = len(titles) > 1
        data["duplicate_meta_descriptions"] = len(metas) > 1
    except Exception as exc:  # pragma: no cover - best effort
        print(f"page metrics error: {exc}")

    if data:
        _update_page_metrics(session, url, data)


def crawl_site(start_url: str, session: Any, max_pages: int = 20) -> None:
    """Crawl the site starting at start_url and scan each page."""
    visited = set()
    queue = [start_url]
    while queue and len(visited) < max_pages:
        url = queue.pop(0)
        if url in visited:
            continue
        visited.add(url)
        scan_page_url(url, session)
        try:
            resp = requests.get(url, timeout=10)
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
        except Exception:
            continue



# Placeholder scan functions. Real implementations should invoke the
# dedicated workers or libraries that perform each scan.

def ssl_scan(domain: str, session: Any) -> None:
    print(f"[SSL] scanning {domain}")


def whois_scan(domain: str, session: Any) -> None:
    print(f"[WHOIS] scanning {domain}")
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
        print(f"whois scan error: {exc}")


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
    try:
        output = webpagetest_test(f"https://{domain}", api_key=os.environ.get("WEBPAGETEST_API_KEY"), verbose=False)
        metrics: Dict[str, Any] = {}
        for line in output.splitlines():
            if line.startswith("Load Time:"):
                metrics["wpt_load_time_ms"] = int(line.split(":", 1)[1].strip().rstrip("ms"))
            elif line.startswith("Speed Index:"):
                metrics["wpt_speed_index"] = float(line.split(":", 1)[1].strip())
            elif line.startswith("TTFB:"):
                metrics["wpt_ttfb_ms"] = int(line.split(":", 1)[1].strip())
        if metrics:
            _update_page_metrics(session, f"https://{domain}", metrics)
    except Exception as exc:  # pragma: no cover - best effort
        print(f"webpagetest error: {exc}")


def screenshot_scan(domain: str, session: Any) -> None:
    print(f"[Screenshot] capturing {domain}")
    try:
        path = screenshot_test(domain)
        _update_page_metrics(session, f"https://{domain}", {"screenshot_path": path})
    except Exception as exc:  # pragma: no cover - best effort
        print(f"screenshot error: {exc}")


def heatmap_scan(domain: str, session: Any) -> None:
    print(f"[Heatmap] generating for {domain}")
    try:
        shot = screenshot_test(domain)
        path = heatmap_test(shot)
        _update_page_metrics(session, f"https://{domain}", {"heatmap_path": path})
    except Exception as exc:  # pragma: no cover - best effort
        print(f"heatmap error: {exc}")


def google_maps_scan(domain: str, session: Any) -> None:
    print(f"[GoogleMaps] scanning {domain}")
    try:
        result = google_maps_test(domain)
        info = json.loads(result)
        _insert_business(session, info)
    except Exception as exc:  # pragma: no cover - best effort
        print(f"google maps error: {exc}")


def initial_recon_scan(domain: str, session: Any) -> None:
    """Run the bundled passive recon tests and store results."""
    print(f"[Recon] scanning {domain}")
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
        print(f"open ports error: {exc}")

    try:
        output = http_methods_test(domain, verbose=False)
        if "Allowed Methods" in output:
            methods_part = output.split(":", 1)[-1]
            methods = [m.strip() for m in methods_part.split(" ") if m.strip()]
            data["allowed_http_methods"] = methods
    except Exception as exc:  # pragma: no cover - best effort
        print(f"http methods error: {exc}")

    try:
        output = waf_detection_test(domain)
        for line in output.splitlines():
            if line.startswith("Detected WAF(s):"):
                wafs = line.split(":", 1)[-1]
                data["waf_name"] = wafs.strip()
                break
    except Exception as exc:  # pragma: no cover - best effort
        print(f"waf detection error: {exc}")

    try:
        data["directory_scan"] = dir_enum_test(domain, verbose=False)
    except Exception as exc:  # pragma: no cover - best effort
        print(f"directory enumeration error: {exc}")

    try:
        data["certificate_info"] = cert_details_test(domain)
    except Exception as exc:  # pragma: no cover - best effort
        print(f"certificate details error: {exc}")

    try:
        output = meta_tags_test(f"https://{domain}", verbose=False)
        for line in output.splitlines():
            if line.lower().startswith("total meta tags found:"):
                num = line.split(":", 1)[-1].strip()
                data["meta_tag_count"] = int(num)
                break
    except Exception as exc:  # pragma: no cover - best effort
        print(f"meta tags error: {exc}")

    try:
        output = sitemaps_robots_test(domain, verbose=False)
        if "Discrepancies found" in output:
            data["sitemap_robots_conflict"] = True
        elif "No discrepancies" in output:
            data["sitemap_robots_conflict"] = False
    except Exception as exc:  # pragma: no cover - best effort
        print(f"sitemap/robots error: {exc}")

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
        print(f"cookie settings error: {exc}")

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
        print(f"external resources error: {exc}")

    try:
        output = subdomains_test(domain, verbose=False)
        for line in output.splitlines():
            if line.startswith("Total Unique Subdomains Found:"):
                num = line.split(":", 1)[-1].strip()
                data["passive_subdomain_count"] = int(num)
                break
    except Exception as exc:  # pragma: no cover - best effort
        print(f"subdomain gathering error: {exc}")

    if data:
        _update_enrichment(session, domain, data)


def page_metrics_scan(domain: str, session: Any) -> None:
    """Gather basic metrics for the site's homepage."""
    print(f"[PageMetrics] scanning {domain}")
    url = f"https://{domain}"
    scan_page_url(url, session)


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
    "screenshot": screenshot_scan,
    "heatmap": heatmap_scan,
    "maps": google_maps_scan,
    "enrich": enrich_scan,
    "recon": initial_recon_scan,
    "page": page_metrics_scan,
}


def run_scans(domain: str, tests: List[str], session: Any) -> None:
    url, redirects = check_site_variants(domain)
    if not url:
        print("Domain not reachable")
        _update_enrichment(session, domain, {"status": False})
        return

    _update_enrichment(session, domain, {"status": True, "canonical_url": url})
    if redirects:
        _update_page_metrics(session, url, {"redirect_chain": redirects})

    canonical = urlparse(url).hostname or domain

    for name in tests:
        if name == "page":
            crawl_site(url, session)
            continue
        func = TESTS.get(name)
        if not func:
            print(f"Unknown test: {name}")
            continue
        func(canonical, session)


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
