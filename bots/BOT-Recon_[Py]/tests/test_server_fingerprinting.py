import requests

def run_test(target):
    """
    Comprehensive Server Fingerprinting Test.
    
    This test sends an HTTP request to the provided target (assumed to be a domain)
    and inspects the response headers to determine the underlying web server,
    framework, or CMS. It analyzes headers such as 'Server', 'X-Powered-By',
    'X-AspNet-Version', and others.
    
    Returns a detailed summary including:
      - The URL used for the request.
      - All response headers.
      - Detected server software and frameworks based on header analysis.
    """
    # Normalize the target URL: default to HTTPS if no scheme is provided.
    if not target.startswith("http://") and not target.startswith("https://"):
        url = "https://" + target
    else:
        url = target
    
    try:
        response = requests.get(url, timeout=10)
        headers = response.headers
    except Exception as e:
        return f"Server Fingerprinting test: Failed to retrieve headers from {target}. Error: {e}"
    
    result_lines = [f"URL: {url}", "Response Headers:"]
    for key, value in headers.items():
        result_lines.append(f"{key}: {value}")
    
    # Analyze headers for server fingerprinting.
    detected_server = []
    server_header = headers.get("Server", "").lower()
    x_powered_by = headers.get("X-Powered-By", "").lower()
    x_aspnet_version = headers.get("X-AspNet-Version", "").lower()
    
    # Define common patterns for server software.
    server_patterns = {
        "Apache": "apache",
        "Nginx": "nginx",
        "Microsoft IIS": "iis",
        "Lighttpd": "lighttpd",
        "Caddy": "caddy",
        "LiteSpeed": "litespeed",
    }
    
    # Define common patterns for frameworks and CMS.
    framework_patterns = {
        "WordPress": "wordpress",
        "PHP": "php",
        "ASP.NET": "asp.net",
        "Drupal": "drupal",
        "Joomla": "joomla",
        "Express": "express",
    }
    
    # Check the Server header.
    for name, pattern in server_patterns.items():
        if pattern in server_header:
            detected_server.append(name)
    
    # Check the X-Powered-By header.
    for name, pattern in framework_patterns.items():
        if pattern in x_powered_by:
            detected_server.append(name)
    
    # Additional check for ASP.NET versions.
    if x_aspnet_version:
        detected_server.append("ASP.NET (Version: " + x_aspnet_version + ")")
    
    if detected_server:
        result_lines.append("\nDetected Server/Frameworks: " + ", ".join(detected_server))
    else:
        result_lines.append("\nNo specific server or framework signature detected.")
    
    return "\n".join(result_lines)
