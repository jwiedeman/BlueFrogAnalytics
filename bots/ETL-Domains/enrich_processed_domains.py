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
import whois  # Standard import for python-whois
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

def get_whois_data(target):
    """Improved WHOIS handling with python-whois"""
    info = defaultdict(str)
    try:
        w = whois.whois(target)
        info['registrar'] = w.registrar if w.registrar else ''
        if w.creation_date:
            if isinstance(w.creation_date, list):
                date = w.creation_date[0] if w.creation_date else None
            else:
                date = w.creation_date
            if date and hasattr(date, 'isoformat'):
                info['registered'] = date.isoformat()
            elif date:
                info['registered'] = str(date)
        if w.updated_date:
            if isinstance(w.updated_date, list):
                date = w.updated_date[0] if w.updated_date else None
            else:
                date = w.updated_date
            if date and hasattr(date, 'isoformat'):
                info['updated'] = date.isoformat()
            elif date:
                info['updated'] = str(date)
    except Exception as e:
        print(f"WHOIS Error: {str(e)}")
    return info

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
    if not is_valid_ip(target):
        try:
            return socket.gethostbyname(target)
        except socket.gaierror:
            return None
    return target

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
    except Exception as e:
        print(f"SSL Error: {str(e)}")
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

def analyze_target(target):
    """Enhanced analysis with technology detection"""
    result = {'query': target}  # Removed explicit status so we always return what we can
    ip = resolve_target(target)
    if not ip:
        print(f"Warning: Could not resolve IP for {target}")
        return result  # Continue with an empty result instead of aborting
    
    result.update(get_geoip_info(ip))
    result.update(get_asn_info(ip))
    result.update(get_whois_data(target))
    result.update(analyze_ssl(target))
    result.update(analyze_content(target))
    
    tech_data = analyze_tech(target)
    result['tech_detect'] = tech_data if tech_data else {'status': 'failed'}
    
    return {k: v for k, v in result.items() if v not in [None, '', {}, []]}

def process_domain(session, update_stmt, domain, tld):
    full_domain = f"{domain}.{tld}"
    print(f"Processing {full_domain}")
    
    try:
        analysis = analyze_target(full_domain)
        # Even if analysis data is partial, proceed to update the record.
        params = (
            str(analysis.get('asname', '')),              # as_name (text)
            str(analysis.get('as', '')),                  # as_number (text)
            str(analysis.get('city', '')),                # city (text)
            str(analysis.get('continent', '')),           # continent (text)
            str(analysis.get('continentCode', '')),       # continent_code (text)
            str(analysis.get('country', '')),             # country (text)
            str(analysis.get('countryCode', '')),         # country_code (text)
            str(analysis.get('isp', '')),                 # isp (text)
            json.dumps(analysis.get('languages', {})),      # languages (text)
            float(analysis.get('lat', 0.0)),              # lat (decimal)
            float(analysis.get('lon', 0.0)),              # lon (decimal)
            str(analysis.get('org', '')),                 # org (text)
            json.dumps(analysis.get('phone', [])),        # phone (text)
            str(analysis.get('region', '')),              # region (text)
            str(analysis.get('regionName', '')),          # region_name (text)
            str(analysis.get('registered', '')),          # registered (text)
            str(analysis.get('registrar', '')),           # registrar (text)
            str(analysis.get('ssl_issuer', '')),          # ssl_issuer (text)
            json.dumps(analysis.get('tech_detect', {})),  # tech_detect (text)
            str(analysis.get('timezone', '')),            # time_zone (text)
            str(analysis.get('updated', '')),             # updated (text)
            domain,                                       # WHERE domain (text)
            tld                                           # WHERE tld (text)
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
        protocol_version=4
    )
    
    try:
        session = cluster.connect("domain_discovery")
        
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
                updated = ?
            WHERE domain = ? AND tld = ?
        """
        update_stmt = session.prepare(update_query)
        
        pool = Pool(CONCURRENCY)
        rows_query = "SELECT domain, tld FROM domains_processed"
        if args.status_true_only:
            rows_query += " WHERE status = true ALLOW FILTERING"
        rows = safe_execute(session, rows_query, ())
        
        for row in rows:
            pool.spawn(process_domain, session, update_stmt, row.domain, row.tld)
            time.sleep(0.1)  # Rate limiting
            
        pool.join()
        
    finally:
        cluster.shutdown()

if __name__ == "__main__":
    main()
