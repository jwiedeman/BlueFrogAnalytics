import socket
import ssl
import whois
import re
import time
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

# Download these databases from MaxMind (free version):
# https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
GEOIP_CITY_DB = 'GeoLite2-City.mmdb'
GEOIP_ASN_DB = 'GeoLite2-ASN.mmdb'

def is_valid_ip(address):
    try:
        ip_address(address)
        return True
    except ValueError:
        return False

def resolve_target(target):
    """Resolve domain to IP or validate IP"""
    if not is_valid_ip(target):
        try:
            return socket.gethostbyname(target)
        except socket.gaierror:
            return None
    return target

def get_geoip_info(ip):
    """Get geographical info from local MaxMind DB"""
    info = defaultdict(str)
    
    try:
        with geoip2.database.Reader(GEOIP_CITY_DB) as reader:
            city = reader.city(ip)
            info['continent'] = city.continent.name
            info['continentCode'] = city.continent.code
            info['country'] = city.country.name
            info['countryCode'] = city.country.iso_code
            info['region'] = city.subdivisions.most_specific.iso_code
            info['regionName'] = city.subdivisions.most_specific.name
            info['city'] = city.city.name
            info['postalCode'] = city.postal.code
            info['lat'] = city.location.latitude
            info['lon'] = city.location.longitude
            info['timezone'] = city.location.time_zone
            
            # Get currency from country code
            country = pycountry.countries.get(alpha_2=info['countryCode'])
            if country:
                currencies = pycountry.currencies.get(alpha_2=country.alpha_2)
                info['currency'] = currencies[0].alpha_3 if currencies else ''
    except Exception:
        pass
    
    return info

def get_asn_info(ip):
    """Get network/ASN info from local MaxMind DB"""
    info = defaultdict(str)
    
    try:
        with geoip2.database.Reader(GEOIP_ASN_DB) as reader:
            asn = reader.asn(ip)
            info['as'] = f"AS{asn.autonomous_system_number}"
            info['asname'] = asn.autonomous_system_organization
            info['isp'] = asn.autonomous_system_organization
            info['org'] = asn.autonomous_system_organization
    except Exception:
        pass
    
    return info

def get_whois_data(target):
    """Get registration information"""
    info = defaultdict(str)
    
    try:
        w = whois.whois(target)
        info['registrar'] = w.registrar
        info['registered'] = w.creation_date.isoformat() if w.creation_date else ''
        info['updated'] = w.updated_date.isoformat() if w.updated_date else ''
    except Exception:
        pass
    
    return info

def analyze_ssl(target):
    """Extract SSL certificate details"""
    info = defaultdict(str)
    
    try:
        ctx = ssl.create_default_context()
        with ctx.wrap_socket(socket.socket(), server_hostname=target) as s:
            s.connect((target, 443))
            cert = s.getpeercert()
            
            # Parse subject info
            subject = dict(x[0] for x in cert['subject'])
            info['ssl_org'] = subject.get('organizationName', '')
            info['ssl_country'] = subject.get('countryName', '')
            
            # Parse issuer info
            issuer = dict(x[0] for x in cert['issuer'])
            info['ssl_issuer'] = issuer.get('commonName', '')
    except Exception:
        pass
    
    return info

def analyze_content(target):
    """Analyze website content characteristics"""
    info = defaultdict(str)
    
    try:
        response = requests.get(f"http://{target}", timeout=10)
        content = response.text.lower()
        
        # Language detection
        langs = detect_langs(content)
        info['languages'] = {lang.lang: lang.prob for lang in langs}
        
        # Common indicators
        patterns = {
            'phone': r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b',
            'zipcode': r'\b\d{5}(?:-\d{4})?\b',
            'address': r'\d+\s+[\w\s]+,\s+[A-Z]{2}\s+\d{5}'
        }
        
        for key, pattern in patterns.items():
            matches = re.findall(pattern, content)
            if matches:
                info[key] = list(set(matches))
    except Exception:
        pass
    
    return info

def get_hosting_info(ip):
    """Detect hosting/datacenter characteristics"""
    info = {
        'hosting': False,
        'proxy': False,
        'mobile': False
    }
    
    try:
        # Check for known hosting ASNs
        asn_info = get_asn_info(ip)['asname'].lower()
        hosting_keywords = ['hosting', 'datacenter', 'server', 'cloud']
        info['hosting'] = any(kw in asn_info for kw in hosting_keywords)
        
        # Check for common proxy ports
        common_proxy_ports = [8080, 3128, 80, 443]
        for port in common_proxy_ports:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex((ip, port))
            if result == 0:
                info['proxy'] = True
                break
    except Exception:
        pass
    
    return info

def analyze_target(target):
    """Main analysis function"""
    result = {
        'query': target,
        'status': 'success',
        'timestamp': datetime.now(pytz.utc).isoformat()
    }
    
    # Resolve to IP if needed
    ip = resolve_target(target)
    if not ip:
        result['status'] = 'error'
        return result
    
    # Merge all data sources
    result.update(get_geoip_info(ip))
    result.update(get_asn_info(ip))
    result.update(get_whois_data(target))
    result.update(analyze_ssl(target))
    result.update(analyze_content(target))
    result.update(get_hosting_info(ip))
    
    # Clean empty fields
    return {k: v for k, v in result.items() if v not in [None, '', {}, []]}

if __name__ == "__main__":
    target = input("Enter IP/Domain to analyze: ")
    start_time = time.time()
    
    report = analyze_target(target)
    report['responseTime'] = f"{(time.time() - start_time)*1000:.2f}ms"
    
    print("\nAnalysis Report:")
    print(json.dumps(report, indent=2, default=str))