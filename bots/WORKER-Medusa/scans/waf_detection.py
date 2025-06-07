import urllib.request
import urllib.error

def run_test(target):
    """
    Comprehensive WAF Detection Test.
    
    This test sends an HTTP request to the provided target (assumed to be a domain).
    It attempts to retrieve the response headers (preferring HTTPS, with a fallback to HTTP)
    and scans the headers for known WAF signatures. The output includes the URL used,
    all response headers, and any detected WAF names.
    """
    # Normalize the target: if no scheme is provided, default to HTTPS.
    if not target.startswith("http://") and not target.startswith("https://"):
        url = "https://" + target
    else:
        url = target

    # Function to fetch headers from the given URL.
    def fetch_headers(url):
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.info()
    
    try:
        headers = fetch_headers(url)
    except Exception as e:
        # If HTTPS fails, and we were using HTTPS, try HTTP fallback.
        if url.startswith("https://"):
            url = "http://" + target
            try:
                headers = fetch_headers(url)
            except Exception as e2:
                return f"WAF Detection test: Failed to retrieve headers from {target} using both HTTPS and HTTP.\nError: {e2}"
        else:
            return f"WAF Detection test: Failed to retrieve headers from {target}.\nError: {e}"

    # Combine headers into a single lower-case string for pattern matching.
    headers_combined = " ".join([f"{k}: {v}" for k, v in headers.items()]).lower()

    # Define known WAF signature patterns.
    waf_signatures = {
        "Cloudflare": ["cloudflare"],
        "Sucuri": ["sucuri"],
        "Incapsula": ["incapsula", "incap"],
        "Akamai": ["akamaitechnologies", "akamaized"],
        "AWS WAF": ["aws waf", "x-amzn-waf"],
        "F5 BIG-IP": ["big-ip"],
        "Imperva": ["imperva"],
        "Citrix NetScaler": ["netscaler"],
        "Mod_Security": ["mod_security"],
    }

    detected_waf = []
    for waf_name, patterns in waf_signatures.items():
        for pattern in patterns:
            if pattern in headers_combined:
                detected_waf.append(waf_name)
                break  # Stop checking further patterns for this WAF.

    # Prepare the result summary.
    result_lines = [f"URL: {url}", "Response Headers:"]
    for key, value in headers.items():
        result_lines.append(f"{key}: {value}")
    
    if detected_waf:
        result_lines.append("\nDetected WAF(s): " + ", ".join(detected_waf))
    else:
        result_lines.append("\nNo known WAF detected based on response headers.")
    
    return "\n".join(result_lines)
