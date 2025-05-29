import socket
import re

def whois_query(domain, server, timeout=10):
    """
    Performs a WHOIS query to the specified server for the given domain.
    Returns the raw response as a string.
    """
    response = ""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout)
        s.connect((server, 43))
        query = domain + "\r\n"
        s.send(query.encode())
        while True:
            data = s.recv(4096)
            if not data:
                break
            response += data.decode(errors='replace')
        s.close()
    except Exception as e:
        response = f"Error querying {server}: {e}"
    return response

def run_test(target):
    """
    Comprehensive WHOIS Recon Test.
    
    This test performs a WHOIS lookup for the provided target domain.
    It first queries a primary WHOIS server based on the TLD 
    (e.g., whois.verisign-grs.com for .com and .net domains, whois.pir.org for .org).
    If the response contains a referral to an authoritative WHOIS server, 
    it performs a secondary lookup. The combined data from both lookups is returned.
    """
    domain = target.strip().lower()
    if not domain:
        return "No target domain provided."

    # Determine the primary WHOIS server based on the TLD.
    primary_server = None
    if domain.endswith(".com") or domain.endswith(".net"):
        primary_server = "whois.verisign-grs.com"
    elif domain.endswith(".org"):
        primary_server = "whois.pir.org"
    else:
        # Fallback to IANA for unsupported or unknown TLDs.
        primary_server = "whois.iana.org"
    
    results = []
    results.append(f"Primary WHOIS lookup for {domain} using {primary_server}:\n")
    primary_response = whois_query(domain, primary_server)
    results.append(primary_response)
    
    # Check for referral to an authoritative WHOIS server.
    referral_match = re.search(r"Whois Server:\s*(\S+)", primary_response, re.IGNORECASE)
    if referral_match:
        referral_server = referral_match.group(1).strip()
        results.append(f"\nReferral detected. Querying authoritative WHOIS server: {referral_server}\n")
        secondary_response = whois_query(domain, referral_server)
        results.append(secondary_response)
    else:
        results.append("\nNo referral WHOIS server found.")
    
    return "\n".join(results)
