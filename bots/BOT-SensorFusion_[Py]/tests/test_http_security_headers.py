import requests
import logging

def run_test(target, verbose=True):
    """
    Comprehensive HTTP Security Headers Test with Verbose Logging.
    
    This test retrieves HTTP response headers from the provided target (assumed to be a domain or URL)
    and inspects common security headers, including:
      - X-Frame-Options
      - X-Content-Type-Options
      - Content-Security-Policy (CSP)
      - Referrer-Policy
      - X-XSS-Protection
      - Strict-Transport-Security (HSTS)
      
    The output includes:
      - The URL used for the request.
      - The values of the above headers (if present).
      - A summary of potential security misconfigurations or recommendations.
    
    Args:
        target (str): The target domain or URL.
        verbose (bool): If True, enables detailed logging.
        
    Returns:
        str: A detailed summary of the HTTP Security Headers Test.
    """
    # Configure logging based on the verbose flag.
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s"
    )
    
    logging.debug("Starting HTTP Security Headers Test.")
    
    # Normalize target: default to HTTPS if no scheme is provided.
    if not target.startswith("http://") and not target.startswith("https://"):
        logging.debug("No scheme provided; defaulting to HTTPS.")
        url = "https://" + target
    else:
        url = target
    logging.debug("Normalized URL: %s", url)
    
    summary_lines = [f"HTTP Security Headers Test for {url}:"]
    
    try:
        logging.debug("Sending GET request to %s", url)
        response = requests.get(url, timeout=10)
        logging.debug("Received response with status code: %d", response.status_code)
        headers = response.headers
        logging.debug("Retrieved headers: %s", headers)
    except Exception as e:
        logging.error("Failed to retrieve headers from %s: %s", url, e)
        return f"HTTP Security Headers test: Failed to retrieve headers from {url}. Error: {e}"
    
    # Extract common security headers.
    x_frame_options = headers.get("X-Frame-Options", "Not Present")
    x_content_type_options = headers.get("X-Content-Type-Options", "Not Present")
    content_security_policy = headers.get("Content-Security-Policy", "Not Present")
    referrer_policy = headers.get("Referrer-Policy", "Not Present")
    x_xss_protection = headers.get("X-XSS-Protection", "Not Present")
    strict_transport_security = headers.get("Strict-Transport-Security", "Not Present")
    
    logging.debug("X-Frame-Options: %s", x_frame_options)
    logging.debug("X-Content-Type-Options: %s", x_content_type_options)
    logging.debug("Content-Security-Policy: %s", content_security_policy)
    logging.debug("Referrer-Policy: %s", referrer_policy)
    logging.debug("X-XSS-Protection: %s", x_xss_protection)
    logging.debug("Strict-Transport-Security: %s", strict_transport_security)
    
    summary_lines.append(f"X-Frame-Options: {x_frame_options}")
    summary_lines.append(f"X-Content-Type-Options: {x_content_type_options}")
    summary_lines.append(f"Content-Security-Policy: {content_security_policy}")
    summary_lines.append(f"Referrer-Policy: {referrer_policy}")
    summary_lines.append(f"X-XSS-Protection: {x_xss_protection}")
    summary_lines.append(f"Strict-Transport-Security: {strict_transport_security}")
    
    # Provide analysis based on header presence.
    if x_frame_options == "Not Present":
        summary_lines.append("\nWarning: X-Frame-Options header is missing. This may expose the site to clickjacking attacks.")
        logging.debug("X-Frame-Options header is missing.")
    if x_content_type_options == "Not Present":
        summary_lines.append("\nWarning: X-Content-Type-Options header is missing. This may expose the site to MIME sniffing attacks.")
        logging.debug("X-Content-Type-Options header is missing.")
    if content_security_policy == "Not Present":
        summary_lines.append("\nWarning: Content-Security-Policy header is missing. Consider implementing CSP to mitigate XSS and data injection attacks.")
        logging.debug("Content-Security-Policy header is missing.")
    if referrer_policy == "Not Present":
        summary_lines.append("\nWarning: Referrer-Policy header is missing. This may result in sensitive information being leaked via the referrer header.")
        logging.debug("Referrer-Policy header is missing.")
    if x_xss_protection == "Not Present":
        summary_lines.append("\nWarning: X-XSS-Protection header is missing. Although deprecated in modern browsers, its absence might be notable.")
        logging.debug("X-XSS-Protection header is missing.")
    if strict_transport_security == "Not Present":
        summary_lines.append("\nWarning: Strict-Transport-Security (HSTS) header is missing. This header is important for enforcing secure connections (HTTPS).")
        logging.debug("Strict-Transport-Security header is missing.")
    
    logging.info("HTTP Security Headers Test completed.")
    return "\n".join(summary_lines)
