#!/usr/bin/env python3
import time
import gevent.monkey
gevent.monkey.patch_all()
import argparse
import certifi

import cassandra.connection
from cassandra.io import geventreactor
cassandra.connection.Connection = geventreactor.GeventConnection

from gevent.pool import Pool
import socket
import ssl
import re
import pytz
import json
import pycountry
from ipaddress import ip_address
from tldextract import extract
from langdetect import detect_langs
from datetime import datetime
from collections import defaultdict
import geoip2.database
import requests
from cassandra.cluster import Cluster
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET
from urllib.parse import urljoin, urlparse, parse_qs
import gzip
import io
from cassandra.policies import DCAwareRoundRobinPolicy, RetryPolicy
from cassandra import Unavailable, OperationTimedOut, WriteTimeout, ReadTimeout
from Wappalyzer import Wappalyzer, WebPage
import warnings

# Suppress specific warnings
warnings.filterwarnings("ignore", category=UserWarning, module="Wappalyzer")

# Configuration
GEOIP_CITY_DB = 'GeoLite2-City.mmdb'
GEOIP_ASN_DB = 'GeoLite2-ASN.mmdb'
CONCURRENCY = 50

def safe_execute(session, query, params):
    delay = 5
    while True:
        try:
            return session.execute(query, params)
        except (OperationTimedOut, Unavailable, WriteTimeout, ReadTimeout) as e:
            print(f"Error ({type(e).__name__}): {e}. Retrying in {delay}s...")
            time.sleep(delay)
            delay = min(delay * 2, 60)


def analyze_tech(target):
    """Robust Wappalyzer implementation"""
    try:
        wappalyzer = Wappalyzer.latest()
        webpage = WebPage.new_from_url(f"http://{target}", timeout=10)
        tech = wappalyzer.analyze(webpage)
        result = {}
        if isinstance(tech, dict):
            for k, v in tech.items():
                if isinstance(v, set):
                    result[k] = list(v)
                else:
                    result[k] = v
            return result
        elif isinstance(tech, (list, set)):
            return {'technologies': list(tech)}
        else:
            return {'technologies': str(tech)}
    except Exception as e:
        print(f"Tech detection error: {str(e)}")
        return {}

def get_asn_info(ip):
    """Get network/ASN info from local MaxMind DB"""
    info = defaultdict(str)
    try:
        with geoip2.database.Reader(GEOIP_ASN_DB) as reader:
            asn = reader.asn(ip)
            info['as'] = f"AS{asn.autonomous_system_number}" if asn.autonomous_system_number else ''
            info['asname'] = asn.autonomous_system_organization or ''
            info['isp'] = asn.autonomous_system_organization or ''
            info['org'] = asn.autonomous_system_organization or ''
    except Exception as e:
        print(f"ASN Error: {str(e)}")
    return info

def resolve_target(target):
    """Resolve domain to IP or validate IP"""
    # If it's an IP address, return it directly
    if is_valid_ip(target):
        return target
    # Validate domain labels to avoid IDNA encoding failures
    labels = target.split('.')
    # Skip resolution if any label is empty or exceeds 63 characters
    if any(len(label) == 0 or len(label) > 63 for label in labels):
        return None
    try:
        return socket.gethostbyname(target)
    except (socket.gaierror, UnicodeError):
        return None

def is_valid_ip(address):
    try:
        ip_address(address)
        return True
    except ValueError:
        return False

def get_geoip_info(ip):
    """Get geographical info from local MaxMind DB"""
    info = defaultdict(str)
    try:
        with geoip2.database.Reader(GEOIP_CITY_DB) as reader:
            city = reader.city(ip)
            info['continent'] = city.continent.name or ''
            info['continentCode'] = city.continent.code or ''
            info['country'] = city.country.name or ''
            info['countryCode'] = city.country.iso_code or ''
            if city.subdivisions:
                info['region'] = city.subdivisions.most_specific.iso_code or ''
                info['regionName'] = city.subdivisions.most_specific.name or ''
            info['city'] = city.city.name or ''
            info['postalCode'] = city.postal.code or ''
            info['lat'] = city.location.latitude or 0.0
            info['lon'] = city.location.longitude or 0.0
            info['timezone'] = city.location.time_zone or ''
    except Exception as e:
        print(f"GeoIP Error: {str(e)}")
    return info

def analyze_ssl(target):
    """Extract SSL certificate details"""
    info = defaultdict(str)
    try:
        ctx = ssl.create_default_context(cafile=certifi.where())
        with ctx.wrap_socket(socket.socket(), server_hostname=target) as s:
            s.connect((target, 443))
            cert = s.getpeercert()
            subject = dict(x[0] for x in cert['subject'])
            info['ssl_org'] = subject.get('organizationName', '')
            issuer = dict(x[0] for x in cert['issuer'])
            info['ssl_issuer'] = issuer.get('commonName', '')
    except ssl.SSLError:
        # Ignore SSL handshake or certificate verification errors
        pass
    except Exception as e:
        print(f"SSL Error: {e}")
    return info

def analyze_content(target):
    """Analyze website content characteristics"""
    info = defaultdict(str)
    try:
        response = requests.get(f"http://{target}", timeout=10)
        content = response.text.lower()
        try:
            langs = detect_langs(content)
            info['languages'] = {lang.lang: lang.prob for lang in langs}
        except Exception as e:
            print(f"Language detection error: {str(e)}")
            info['languages'] = {}
            
        patterns = {
            'phone': r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b',
            'zipcode': r'\b\d{5}(?:-\d{4})?\b',
        }
        for key, pattern in patterns.items():
            matches = re.findall(pattern, content)
            if matches:
                info[key] = list(set(matches))
    except Exception as e:
        print(f"Content Error: {str(e)}")
    return info

def analyze_homepage(target):
    """Extract homepage details such as title, description, links, emails, etc."""
    info = {}
    try:
        url = f"http://{target}"
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        html_text = resp.text
        soup = BeautifulSoup(html_text, 'html.parser')

        # Title
        title = ''
        if soup.title and soup.title.string:
            title = soup.title.string.strip()
        info['title'] = title

        # Description
        description = ''
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc and meta_desc.get('content'):
            description = meta_desc['content'].strip()
        info['description'] = description

        # Internal links (absolute and root-relative), deduplicated
        domain_base = target.split('//')[-1].split('/')[0]
        links = []
        for a in soup.find_all('a', href=True):
            href = a['href']
            if href.startswith('/') or domain_base in href:
                links.append(href)
        unique_links = set(links)
        info['more_than_5_internal_links'] = len(unique_links) > 5

        # Google Tag Manager / Analytics detection (inline, scripts, dataLayer, cookies)
        html_lower = html_text.lower()
        has_gtm_inline = 'gtm-' in html_lower
        has_ga_inline = 'google-analytics' in html_lower
        # Script src detection
        script_srcs = [tag.get('src', '') for tag in soup.find_all('script', src=True)]
        has_gtm_src = any('googletagmanager.com' in src for src in script_srcs)
        has_ga_src = any('google-analytics.com' in src for src in script_srcs)
        # dataLayer detection
        has_datalayer = 'datalayer' in html_lower
        # Cookie detection (_ga, _gid, etc.)
        ga_cookies = [c.name for c in resp.cookies] if hasattr(resp, 'cookies') else []
        has_ga_cookie = any(name.startswith('_ga') for name in ga_cookies)
        info['contains_gtm_or_ga'] = any([
            has_gtm_inline, has_ga_inline,
            has_gtm_src, has_ga_src,
            has_datalayer, has_ga_cookie
        ])

        # Email scraping (regex and mailto links)
        emails = set(re.findall(
            r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", html_text
        ))
        for a in soup.find_all('a', href=True):
            href = a['href']
            if href.lower().startswith('mailto:'):
                addr = href.split(':', 1)[1].split('?')[0].strip()
                if addr:
                    emails.add(addr)
        info['emails'] = list(emails)

        # WordPress version from meta generator
        wp_version = ''
        gen_meta = soup.find('meta', attrs={'name': 'generator'})
        if gen_meta and 'wordpress' in gen_meta.get('content', '').lower():
            match = re.search(r"WordPress\s*([\d.]+)", gen_meta['content'], re.IGNORECASE)
            if match:
                wp_version = match.group(1)
        info['wordpress_version'] = wp_version
        # WordPress asset version detection (wp-content URLs with ?ver=)
        asset_versions = []
        for tag in soup.find_all(['script', 'link']):
            url_attr = tag.get('src') or tag.get('href') or ''
            if 'wp-content' in url_attr and 'ver=' in url_attr:
                parsed = urlparse(url_attr)
                qs = parse_qs(parsed.query)
                ver_list = qs.get('ver')
                if ver_list:
                    asset_versions.append(ver_list[0])
        if asset_versions:
            try:
                # choose highest semantic version
                sorted_vers = sorted(
                    asset_versions,
                    key=lambda s: tuple(int(x) for x in re.findall(r"\d+", s))
                )
                info['wordpress_asset_version'] = sorted_vers[-1]
            except Exception:
                info['wordpress_asset_version'] = asset_versions[-1]
        else:
            info['wordpress_asset_version'] = ''

        # Server type & version
        server_info = resp.headers.get('Server', '')
        server_type = ''
        server_version = ''
        if server_info:
            parts = server_info.split('/')
            server_type = parts[0]
            if len(parts) > 1:
                ver_match = re.search(r"[\d.]+", parts[1])
                if ver_match:
                    server_version = ver_match.group(0)
        info['server_type'] = server_type
        info['server_version'] = server_version
        # Additional header detection
        info['x_powered_by'] = resp.headers.get('X-Powered-By', '')

        # WordPress JSON API check
        wp_json_url = url.rstrip('/') + '/wp-json/wp/v2/pages'
        wpjson_size = 0
        wpjson_contains_cart = False
        try:
            wpresp = requests.get(wp_json_url, timeout=5)
            if wpresp.status_code == 200:
                wpjson_size = len(wpresp.content)
                text_lower = wpresp.text.lower()
                if 'woocommerce' in text_lower or 'cart' in text_lower:
                    wpjson_contains_cart = True
        except Exception:
            pass
        info['wpjson_size_bytes'] = wpjson_size
        info['wpjson_contains_cart'] = wpjson_contains_cart

        # LinkedIn profile link
        linkedin_url = ''
        for a in soup.find_all('a', href=True):
            if 'linkedin.com' in a['href']:
                linkedin_url = a['href']
                break
        info['linkedin_url'] = linkedin_url

        # About & Services page detection
        info['has_about_page'] = any(
            'about' in href.lower() for href in internal_links
        )
        info['has_services_page'] = any(
            'service' in href.lower() for href in internal_links
        )

        # Shopping cart / product detection (keywords and platform indicators)
        cart_keywords = ['cart', 'checkout', 'product', 'shop', 'basket', 'add-to-cart']
        info['has_cart_or_product'] = any(kw in html_lower for kw in cart_keywords)
        # E-commerce platform detection from page content
        platforms = ['woocommerce', 'shopify', 'bigcommerce', 'magento']
        info['ecommerce_platforms'] = [p for p in platforms if p in html_lower]
    except Exception as e:
        print(f"Homepage analysis error for {target}: {e}")
    return info

def count_sitemap_pages(target):
    """Count total pages in sitemaps referenced by robots.txt or sitemap.xml."""
    visited = set()
    def parse_sitemap(url):
        if url in visited:
            return 0
        visited.add(url)
        try:
            resp = requests.get(url, timeout=10)
            if resp.status_code != 200:
                return 0
            raw = resp.content
            # Decompress gzipped sitemap if needed
            if url.lower().endswith('.gz'):
                buf = io.BytesIO(raw)
                try:
                    with gzip.GzipFile(fileobj=buf) as gf:
                        xml_content = gf.read()
                except Exception:
                    return 0
            else:
                xml_content = raw
            root = ET.fromstring(xml_content)
        except Exception:
            return 0
        tag = root.tag.lower()
        total = 0
        if tag.endswith('sitemapindex'):
            for sitemap in root.findall('.//{*}sitemap'):
                loc = sitemap.find('{*}loc')
                if loc is not None and loc.text:
                    child_url = loc.text.strip()
                    # Resolve relative URLs
                    if not child_url.lower().startswith('http'):
                        child_url = urljoin(url, child_url)
                    total += parse_sitemap(child_url)
        elif tag.endswith('urlset'):
            total += len(root.findall('.//{*}url'))
        return total

    # Retrieve sitemap URLs from robots.txt
    base_url = f"http://{target}"
    try:
        robots = requests.get(f"{base_url}/robots.txt", timeout=5)
        sitemaps = re.findall(r'(?i)Sitemap:\s*(\S+)', robots.text)
    except Exception:
        sitemaps = []
    # Default fallback
    if not sitemaps:
        sitemaps = [f"{base_url}/sitemap.xml"]
    total_pages = 0
    for sitemap_url in sitemaps:
        # Resolve relative URLs
        if not sitemap_url.lower().startswith('http'):
            sitemap_url = urljoin(base_url, sitemap_url)
        total_pages += parse_sitemap(sitemap_url)
    return total_pages

def analyze_target(target):
    """Enhanced analysis with technology detection"""
    result = {'query': target}  # Removed explicit status so we always return what we can
    ip = resolve_target(target)
    if not ip:
        print(f"Warning: Could not resolve IP for {target}")
        return result  # Continue with an empty result instead of aborting
    
    result.update(get_geoip_info(ip))
    result.update(get_asn_info(ip))
    result.update(analyze_ssl(target))
    result.update(analyze_content(target))

    homepage = analyze_homepage(target)
    result.update(homepage)
    result['sitemap_page_count'] = count_sitemap_pages(target)

    tech_data = analyze_tech(target)
    result['tech_detect'] = tech_data if tech_data else {'status': 'failed'}
    
    return {k: v for k, v in result.items() if v not in [None, '', {}, []]}

def process_domain(session, update_stmt, domain, tld):
    # Clean up domain and tld to avoid duplicate dots or leading/trailing dots
    domain_clean = domain.strip().strip('.')
    tld_clean = tld.strip().strip('.')
    full_domain = f"{domain_clean}.{tld_clean}"
    print(f"Processing {full_domain}")
    
    try:
        analysis = analyze_target(full_domain)
        # Even if analysis data is partial, proceed to update the record.
        params = (
            str(analysis.get('asname', '')),
            str(analysis.get('as', '')),
            str(analysis.get('city', '')),
            str(analysis.get('continent', '')),
            str(analysis.get('continentCode', '')),
            str(analysis.get('country', '')),
            str(analysis.get('countryCode', '')),
            str(analysis.get('isp', '')),
            json.dumps(analysis.get('languages', {})),
            float(analysis.get('lat', 0.0)),
            float(analysis.get('lon', 0.0)),
            str(analysis.get('org', '')),
            json.dumps(analysis.get('phone', [])),
            str(analysis.get('region', '')),
            str(analysis.get('regionName', '')),
            str(analysis.get('registered', '')),
            str(analysis.get('registrar', '')),
            str(analysis.get('ssl_issuer', '')),
            json.dumps(analysis.get('tech_detect', {})),
            str(analysis.get('timezone', '')),
            str(analysis.get('title', '')),
            str(analysis.get('description', '')),
            str(analysis.get('linkedin_url', '')),
            bool(analysis.get('has_about_page', False)),
            bool(analysis.get('has_services_page', False)),
            bool(analysis.get('has_cart_or_product', False)),
            bool(analysis.get('contains_gtm_or_ga', False)),
            str(analysis.get('wordpress_version', '')),
            str(analysis.get('server_type', '')),
            str(analysis.get('server_version', '')),
            json.dumps(analysis.get('emails', [])),
            int(analysis.get('sitemap_page_count', 0)),
            str(analysis.get('updated', '')),
            datetime.utcnow().isoformat(),
            domain,
            tld
        )
        
        safe_execute(session, update_stmt, params)
        print(f"Updated {full_domain}")
    except Exception as e:
        print(f"Error processing {full_domain}: {str(e)}")

def main():
    parser = argparse.ArgumentParser(description="Enrich processed domains")
    parser.add_argument(
        "--status-true-only",
        action="store_true",
        help="Only process rows where status=true",
    )
    args = parser.parse_args()

    cluster = Cluster(
        contact_points=["192.168.1.201", "192.168.1.202",
                        "192.168.1.203", "192.168.1.204"],
        load_balancing_policy=DCAwareRoundRobinPolicy(local_dc='datacenter1'),
        default_retry_policy=RetryPolicy(),
        protocol_version=4,
        connect_timeout=600,
        idle_heartbeat_timeout=600
    )
    
    try:
        session = cluster.connect("domain_discovery")
        session.default_timeout = 600
        
        update_query = """
            UPDATE domain_discovery.domains_processed SET
                as_name = ?,
                as_number = ?,
                city = ?,
                continent = ?,
                continent_code = ?,
                country = ?,
                country_code = ?,
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
                tech_detect = ?,
                time_zone = ?,
                title = ?,
                description = ?,
                linkedin_url = ?,
                has_about_page = ?,
                has_services_page = ?,
                has_cart_or_product = ?,
                contains_gtm_or_ga = ?,
                wordpress_version = ?,
                server_type = ?,
                server_version = ?,
                emails = ?,
                sitemap_page_count = ?,
                updated = ?,
                last_enriched = ?
            WHERE domain = ? AND tld = ?
        """
        update_stmt = session.prepare(update_query)
        
        pool = Pool(CONCURRENCY)
        rows_query = (
            "SELECT domain, tld, refresh_hours, last_enriched FROM domains_processed WHERE user_managed = true ALLOW FILTERING"
        )
        rows = safe_execute(session, rows_query, ())

        now = datetime.utcnow()
        for row in rows:
            rh = row.refresh_hours or 168
            last = row.last_enriched
            if not last or (now - last).total_seconds() > rh * 3600:
                pool.spawn(process_domain, session, update_stmt, row.domain, row.tld)
                time.sleep(0.1)

        pool.join()
        
    finally:
        cluster.shutdown()

if __name__ == "__main__":
    main()
