#!/usr/bin/env python3
"""Utilities for domain enrichment.

This module provides the :func:`analyze_target` function which mirrors the
capabilities of the original ``enrich_processed_domain`` worker. The
implementation is self contained so ``medusa.py`` can run enrichment
scans without importing from another worker.
"""

import certifi
import gzip
import io
import json
import random
import re
import socket
import ssl
import warnings
from collections import defaultdict
from ipaddress import ip_address
from typing import Dict, Any, List
from urllib.parse import urljoin, urlparse, parse_qs

import geoip2.database
import requests
from bs4 import BeautifulSoup
from langdetect import detect_langs
from tldextract import extract

# Local patched copy of Wappalyzer bundled with this worker
from Wappalyzer import Wappalyzer, WebPage

warnings.filterwarnings("ignore", category=UserWarning, module="Wappalyzer")

GEOIP_CITY_DB = "GeoLite2-City.mmdb"
GEOIP_ASN_DB = "GeoLite2-ASN.mmdb"
HEAD_TIMEOUT = 5

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_2 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Version/15.2 Mobile/15E148 Safari/537.36",
]


def random_user_agent() -> str:
    return random.choice(USER_AGENTS)


def extract_contact_details(html_text: str) -> Dict[str, List[str]]:
    """Extract phone numbers, emails, SMS links and street addresses."""
    soup = BeautifulSoup(html_text, "html.parser")
    text = soup.get_text(" ")

    phones = set(re.findall(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b", text))
    emails = set(re.findall(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", html_text))
    sms_numbers = set()
    addresses = set()

    for a in soup.find_all("a", href=True):
        href = a["href"].lower()
        if href.startswith("tel:"):
            num = href.split(":", 1)[1].split("?")[0]
            if num:
                phones.add(num)
        if href.startswith("sms:") or href.startswith("smsto:"):
            num = href.split(":", 1)[1].split("?")[0]
            if num:
                sms_numbers.add(num)
        if href.startswith("mailto:"):
            addr = href.split(":", 1)[1].split("?")[0]
            if addr:
                emails.add(addr)

    for tag in soup.find_all("address"):
        txt = tag.get_text(" ", strip=True)
        if txt:
            addresses.add(txt)

    addr_regex = re.compile(
        r"\b\d{1,5}\s+[\w\s.'-]{2,40}\s(?:st|street|rd|road|ave|avenue|blvd|boulevard|ln|lane|dr|drive|ct|court|cir|circle)\b[^\n<]{0,50}",
        re.IGNORECASE,
    )
    for match in addr_regex.findall(text):
        addresses.add(match.strip())

    return {
        "phone_numbers": sorted(phones),
        "emails": sorted(emails),
        "sms_numbers": sorted(sms_numbers),
        "addresses": sorted(addresses),
    }


def check_url(url: str) -> bool:
    try:
        resp = requests.head(
            url,
            timeout=HEAD_TIMEOUT,
            allow_redirects=False,
            headers={"User-Agent": random_user_agent(), "Accept": "*/*"},
        )
        return 200 <= resp.status_code < 500
    except Exception:
        return False


def is_domain_up(domain: str) -> bool:
    variants = [
        f"https://{domain}",
        f"https://www.{domain}",
        f"http://{domain}",
        f"http://www.{domain}",
    ]
    for url in variants:
        if check_url(url):
            return True
    return False


def security_header_info(headers: Dict[str, str]) -> Dict[str, Any]:
    """Return security header score and detected headers."""
    known = [
        "Content-Security-Policy",
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Referrer-Policy",
        "Strict-Transport-Security",
    ]
    detected: List[str] = [h for h in known if h in headers]
    return {
        "security_headers_score": len(detected),
        "security_headers_detected": detected,
        "hsts_enabled": "Strict-Transport-Security" in headers,
    }


def fetch_robots_txt(target: str) -> Dict[str, Any]:
    """Return robots.txt presence and content."""
    url = f"http://{target}/robots.txt"
    try:
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            return {"robots_txt_exists": True, "robots_txt_content": resp.text}
    except Exception:
        pass
    return {"robots_txt_exists": False, "robots_txt_content": ""}


def analyze_tech(target: str) -> Dict[str, Any]:
    """Detect site technology using the bundled Wappalyzer."""
    try:
        wappalyzer = Wappalyzer.latest()
        webpage = WebPage.new_from_url(f"http://{target}", timeout=10)
        tech = wappalyzer.analyze(webpage)
        result: Dict[str, Any] = {}
        if isinstance(tech, dict):
            for k, v in tech.items():
                result[k] = list(v) if isinstance(v, set) else v
            return result
        if isinstance(tech, (list, set)):
            return {"technologies": list(tech)}
        return {"technologies": str(tech)}
    except Exception as e:  # pragma: no cover - best effort
        print(f"Tech detection error: {e}")
        return {}


def get_asn_info(ip: str) -> Dict[str, Any]:
    info = defaultdict(str)
    try:
        with geoip2.database.Reader(GEOIP_ASN_DB) as reader:
            asn = reader.asn(ip)
            info["as"] = f"AS{asn.autonomous_system_number}" if asn.autonomous_system_number else ""
            info["asname"] = asn.autonomous_system_organization or ""
            info["isp"] = asn.autonomous_system_organization or ""
            info["org"] = asn.autonomous_system_organization or ""
    except Exception as e:
        print(f"ASN Error: {e}")
    return info


def resolve_target(target: str) -> str | None:
    if is_valid_ip(target):
        return target
    labels = target.split(".")
    if any(len(label) == 0 or len(label) > 63 for label in labels):
        return None
    try:
        return socket.gethostbyname(target)
    except (socket.gaierror, UnicodeError):
        return None


def is_valid_ip(address: str) -> bool:
    try:
        ip_address(address)
        return True
    except ValueError:
        return False


def get_geoip_info(ip: str) -> Dict[str, Any]:
    info = defaultdict(str)
    try:
        with geoip2.database.Reader(GEOIP_CITY_DB) as reader:
            city = reader.city(ip)
            info["continent"] = city.continent.name or ""
            info["continentCode"] = city.continent.code or ""
            info["country"] = city.country.name or ""
            info["countryCode"] = city.country.iso_code or ""
            if city.subdivisions:
                info["region"] = city.subdivisions.most_specific.iso_code or ""
                info["regionName"] = city.subdivisions.most_specific.name or ""
            info["city"] = city.city.name or ""
            info["postalCode"] = city.postal.code or ""
            info["lat"] = city.location.latitude or 0.0
            info["lon"] = city.location.longitude or 0.0
            info["timezone"] = city.location.time_zone or ""
    except Exception as e:
        print(f"GeoIP Error: {e}")
    return info


def analyze_ssl(target: str) -> Dict[str, Any]:
    info = defaultdict(str)
    try:
        ctx = ssl.create_default_context(cafile=certifi.where())
        with ctx.wrap_socket(socket.socket(), server_hostname=target) as s:
            s.connect((target, 443))
            cert = s.getpeercert()
            subject = dict(x[0] for x in cert["subject"])
            issuer = dict(x[0] for x in cert["issuer"])
            info["ssl_org"] = subject.get("organizationName", "")
            info["ssl_issuer"] = issuer.get("commonName", "")
    except ssl.SSLError:
        pass
    except Exception as e:
        print(f"SSL Error: {e}")
    return info


def analyze_content(target: str) -> Dict[str, Any]:
    info = defaultdict(str)
    try:
        response = requests.get(f"http://{target}", timeout=10)
        content = response.text.lower()
        try:
            langs = detect_langs(content)
            info["languages"] = {lang.lang: lang.prob for lang in langs}
        except Exception as e:
            print(f"Language detection error: {e}")
            info["languages"] = {}
        info.update(extract_contact_details(response.text))
        patterns = {
            "zipcode": r"\b\d{5}(?:-\d{4})?\b",
        }
        for key, pattern in patterns.items():
            matches = re.findall(pattern, content)
            if matches:
                info[key] = list(set(matches))
    except Exception as e:
        print(f"Content Error: {e}")
    return info


def analyze_homepage(target: str, is_wordpress: bool = False) -> Dict[str, Any]:
    """Scrape the homepage and return metadata.

    WordPress specific checks are skipped unless ``is_wordpress`` is ``True``.
    """
    info: Dict[str, Any] = {}
    try:
        url = f"http://{target}"
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        html_text = resp.text
        soup = BeautifulSoup(html_text, "html.parser")

        # HTTP level metrics
        version_map = {10: "HTTP/1.0", 11: "HTTP/1.1", 20: "HTTP/2"}
        info["http_version"] = version_map.get(getattr(resp.raw, "version", 11), "HTTP/1.1")
        info["compression_enabled"] = resp.headers.get("Content-Encoding", "").lower() in ("gzip", "br")
        info["cache_control_headers"] = resp.headers.get("Cache-Control", "")
        info["page_weight_bytes"] = len(resp.content)

        security = security_header_info(resp.headers)
        info.update(security)

        cdn_headers = " ".join(resp.headers.get(h, "") for h in ["Server", "Via", "X-CDN"])
        info["cdn_detected"] = any(x in cdn_headers.lower() for x in ["cloudflare", "akamai", "fastly", "cdn"])

        title = soup.title.string.strip() if soup.title and soup.title.string else ""
        info["title"] = title

        description = ""
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc and meta_desc.get("content"):
            description = meta_desc["content"].strip()
        info["description"] = description

        # Language meta
        lang_attr = soup.html.get("lang") if soup.html else ""
        info["main_language"] = lang_attr or ""

        keywords_meta = soup.find("meta", attrs={"name": "keywords"})
        if keywords_meta and keywords_meta.get("content"):
            info["content_keywords"] = keywords_meta["content"].strip()

        domain_base = target.split("//")[-1].split("/")[0]
        links = []
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if href.startswith("/") or domain_base in href:
                links.append(href)
        internal_links = set(links)
        info["more_than_5_internal_links"] = len(internal_links) > 5

        html_lower = html_text.lower()
        has_gtm_inline = "gtm-" in html_lower
        has_ga_inline = "google-analytics" in html_lower
        script_srcs = [tag.get("src", "") for tag in soup.find_all("script", src=True)]
        has_gtm_src = any("googletagmanager.com" in src for src in script_srcs)
        has_ga_src = any("google-analytics.com" in src for src in script_srcs)
        has_datalayer = "datalayer" in html_lower
        ga_cookies = [c.name for c in resp.cookies] if hasattr(resp, "cookies") else []
        has_ga_cookie = any(name.startswith("_ga") for name in ga_cookies)
        info["contains_gtm_or_ga"] = any([
            has_gtm_inline,
            has_ga_inline,
            has_gtm_src,
            has_ga_src,
            has_datalayer,
            has_ga_cookie,
        ])
        info["third_party_scripts"] = sum(
            1
            for src in script_srcs
            if src and not src.startswith("/") and domain_base not in src
        )

        contacts = extract_contact_details(html_text)
        if contacts["emails"]:
            info["emails"] = contacts["emails"]
        if contacts["phone_numbers"]:
            info["phone_numbers"] = contacts["phone_numbers"]
        if contacts["sms_numbers"]:
            info["sms_numbers"] = contacts["sms_numbers"]
        if contacts["addresses"]:
            info["addresses"] = contacts["addresses"]

        # favicon & canonical
        fav = soup.find("link", rel=lambda x: x and "icon" in x.lower())
        fav_href = fav["href"] if fav and fav.get("href") else "/favicon.ico"
        if fav_href and not fav_href.lower().startswith("http"):
            fav_href = urljoin(url, fav_href)
        info["favicon_url"] = fav_href

        canonical = soup.find("link", rel="canonical")
        if canonical and canonical.get("href"):
            info["canonical_url"] = canonical["href"].strip()

        # Heading counts
        info["h1_count"] = len(soup.find_all("h1"))
        info["h2_count"] = len(soup.find_all("h2"))
        info["h3_count"] = len(soup.find_all("h3"))

        # Schema markup
        schema_scripts = soup.find_all("script", type="application/ld+json")
        types: List[str] = []
        for sc in schema_scripts:
            try:
                data = json.loads(sc.string or "{}")
                if isinstance(data, dict) and "@type" in data:
                    if isinstance(data["@type"], list):
                        types.extend(data["@type"])
                    else:
                        types.append(str(data["@type"]))
            except Exception:
                continue
        info["schema_markup_detected"] = bool(schema_scripts)
        if types:
            info["schema_types"] = sorted(set(types))

        # Social profiles
        social_sites = ["facebook.com", "twitter.com", "instagram.com", "linkedin.com"]
        social = []
        for a in soup.find_all("a", href=True):
            for site in social_sites:
                if site in a["href"]:
                    social.append(a["href"])
                    break
        if social:
            info["social_media_profiles"] = sorted(set(social))

        rss = soup.find("link", type="application/rss+xml")
        info["rss_feed_detected"] = bool(rss)

        newsletter = any(
            ("newsletter" in form.get("id", "").lower() or "newsletter" in form.get("class", "").lower())
            for form in soup.find_all("form")
        )
        info["newsletter_signup_detected"] = newsletter


        if is_wordpress:
            wp_version = ""
            gen_meta = soup.find("meta", attrs={"name": "generator"})
            if gen_meta and "wordpress" in gen_meta.get("content", "").lower():
                match = re.search(r"WordPress\s*([\d.]+)", gen_meta["content"], re.IGNORECASE)
                if match:
                    wp_version = match.group(1)
            info["wordpress_version"] = wp_version

            asset_versions = []
            for tag in soup.find_all(["script", "link"]):
                url_attr = tag.get("src") or tag.get("href") or ""
                if "wp-content" in url_attr and "ver=" in url_attr:
                    parsed = urlparse(url_attr)
                    qs = parse_qs(parsed.query)
                    ver_list = qs.get("ver")
                    if ver_list:
                        asset_versions.append(ver_list[0])
            if asset_versions:
                try:
                    sorted_vers = sorted(
                        asset_versions,
                        key=lambda s: tuple(int(x) for x in re.findall(r"\d+", s)),
                    )
                    info["wordpress_asset_version"] = sorted_vers[-1]
                except Exception:
                    info["wordpress_asset_version"] = asset_versions[-1]

            wp_json_url = url.rstrip("/") + "/wp-json/wp/v2/pages"
            wpjson_size = 0
            wpjson_contains_cart = False
            try:
                wpresp = requests.get(wp_json_url, timeout=5)
                if wpresp.status_code == 200:
                    wpjson_size = len(wpresp.content)
                    text_lower = wpresp.text.lower()
                    if "woocommerce" in text_lower or "cart" in text_lower:
                        wpjson_contains_cart = True
            except Exception:
                pass
            info["wpjson_size_bytes"] = wpjson_size
            info["wpjson_contains_cart"] = wpjson_contains_cart

        server_info = resp.headers.get("Server", "")
        server_type = ""
        server_version = ""
        if server_info:
            parts = server_info.split("/")
            server_type = parts[0]
            if len(parts) > 1:
                ver_match = re.search(r"[\d.]+", parts[1])
                if ver_match:
                    server_version = ver_match.group(0)
        info["server_type"] = server_type
        info["server_version"] = server_version
        info["x_powered_by"] = resp.headers.get("X-Powered-By", "")

        linkedin_url = ""
        for a in soup.find_all("a", href=True):
            if "linkedin.com" in a["href"]:
                linkedin_url = a["href"]
                break
        info["linkedin_url"] = linkedin_url

        info["has_about_page"] = any("about" in href.lower() for href in internal_links)
        info["has_services_page"] = any("service" in href.lower() for href in internal_links)

        cart_keywords = ["cart", "checkout", "product", "shop", "basket", "add-to-cart"]
        info["has_cart_or_product"] = any(kw in html_lower for kw in cart_keywords)
        platforms = ["woocommerce", "shopify", "bigcommerce", "magento"]
        info["ecommerce_platforms"] = [p for p in platforms if p in html_lower]

        # Accessibility placeholders
        info["color_contrast_issues"] = 0
        info["aria_landmark_count"] = len(soup.find_all(attrs={"role": True}))
        info["form_accessibility_issues"] = 0
    except Exception as e:
        print(f"Homepage analysis error for {target}: {e}")
    return info


def count_sitemap_pages(target: str) -> int:
    visited = set()

    def parse_sitemap(url: str) -> int:
        if url in visited:
            return 0
        visited.add(url)
        try:
            resp = requests.get(url, timeout=10)
            if resp.status_code != 200:
                return 0
            raw = resp.content
            if url.lower().endswith(".gz"):
                buf = io.BytesIO(raw)
                try:
                    with gzip.GzipFile(fileobj=buf) as gf:
                        xml_content = gf.read()
                except Exception:
                    return 0
            else:
                xml_content = raw
            root = BeautifulSoup(xml_content, "xml")
        except Exception:
            return 0
        tag = root.find().name.lower() if root.find() else ""
        total = 0
        if tag.endswith("sitemapindex"):
            for sitemap in root.find_all("sitemap"):
                loc = sitemap.find("loc")
                if loc and loc.text:
                    child_url = loc.text.strip()
                    if not child_url.lower().startswith("http"):
                        child_url = urljoin(url, child_url)
                    total += parse_sitemap(child_url)
        elif tag.endswith("urlset"):
            total += len(root.find_all("url"))
        return total

    base_url = f"http://{target}"
    try:
        robots = requests.get(f"{base_url}/robots.txt", timeout=5)
        sitemaps = re.findall(r"(?i)Sitemap:\s*(\S+)", robots.text)
    except Exception:
        sitemaps = []
    if not sitemaps:
        sitemaps = [f"{base_url}/sitemap.xml"]
    total_pages = 0
    for sitemap_url in sitemaps:
        if not sitemap_url.lower().startswith("http"):
            sitemap_url = urljoin(base_url, sitemap_url)
        total_pages += parse_sitemap(sitemap_url)
    return total_pages


def analyze_target(target: str) -> Dict[str, Any]:
    result: Dict[str, Any] = {"query": target}
    ip = resolve_target(target)
    if not ip:
        print(f"Warning: Could not resolve IP for {target}")
        return result

    result.update(get_geoip_info(ip))
    result.update(get_asn_info(ip))
    result.update(analyze_ssl(target))
    result.update(analyze_content(target))

    tech_data = analyze_tech(target)
    result["tech_detect"] = tech_data if tech_data else {"status": "failed"}
    tech_str = json.dumps(tech_data).lower() if tech_data else ""
    is_wordpress = "wordpress" in tech_str

    homepage = analyze_homepage(target, is_wordpress)
    result.update(homepage)
    result["sitemap_page_count"] = count_sitemap_pages(target)
    result.update(fetch_robots_txt(target))

    if "main_language" not in result:
        langs = result.get("languages", {})
        if langs:
            result["main_language"] = max(langs, key=langs.get)

    ecommerce_terms = ["woocommerce", "shopify", "bigcommerce", "magento"]
    detected = {p for p in ecommerce_terms if p in tech_str}
    if "ecommerce_platforms" in result:
        detected.update(result["ecommerce_platforms"])
    if detected:
        result["ecommerce_platforms"] = sorted(detected)

    return {k: v for k, v in result.items() if v not in [None, "", {}, []]}
