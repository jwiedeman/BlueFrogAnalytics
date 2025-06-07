import requests
import logging
from urllib.parse import urlparse

def run_test(target, verbose=True):
    """
    Comprehensive Domain Variations Test with Verbose Logging.
    
    This test examines four variations of the provided target domain:
      1. HTTP without www
      2. HTTPS without www
      3. HTTP with www
      4. HTTPS with www
    
    For each variation, the test sends an HTTP request (with redirects enabled) and logs:
      - The full redirect chain (if any).
      - The final URL reached.
      - The final status code (or error if blocked).
    
    A custom User-Agent header is used to mimic a common browser, which can help reduce 403 responses.
    
    Args:
        target (str): The target domain (e.g., "example.com" or "https://example.com").
        verbose (bool): If True, detailed logging is enabled.
        
    Returns:
        str: A detailed summary of the results for each domain variation.
    """
    # Configure logging.
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s"
    )
    
    # Normalize target: Remove any scheme and "www." prefix.
    parsed = urlparse(target)
    netloc = parsed.netloc if parsed.netloc else parsed.path
    if netloc.startswith("www."):
        netloc = netloc[4:]
    
    # Define the four variations.
    variations = {
        "HTTP without www": "http://" + netloc,
        "HTTPS without www": "https://" + netloc,
        "HTTP with www": "http://www." + netloc,
        "HTTPS with www": "https://www." + netloc,
    }
    
    summary_lines = [f"Domain Variations Test for '{target}' (normalized: '{netloc}'):"]
    
    # Custom headers to mimic a browser.
    headers = {
        "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) "
                       "Chrome/115.0 Safari/537.36")
    }
    
    for label, url in variations.items():
        summary_lines.append("\n" + "=" * 60)
        summary_lines.append(f"Testing Variation: {label}")
        summary_lines.append(f"Initial URL: {url}")
        logging.debug(f"Testing variation '{label}' with URL: {url}")
        
        try:
            response = requests.get(url, timeout=10, allow_redirects=True, headers=headers)
            # Log redirect chain.
            if response.history:
                summary_lines.append("Redirect Chain:")
                for resp in response.history:
                    location = resp.headers.get("Location", "N/A")
                    summary_lines.append(f" - {resp.status_code} -> {location}")
                    logging.debug(f"Redirect: {resp.status_code} -> {location}")
            else:
                summary_lines.append("No redirects encountered.")
                logging.debug("No redirects for this variation.")
            
            summary_lines.append(f"Final URL: {response.url}")
            summary_lines.append(f"Final Status Code: {response.status_code}")
            logging.debug(f"Final URL: {response.url}, Status Code: {response.status_code}")
        except Exception as e:
            error_msg = f"Error accessing {url}: {e}"
            summary_lines.append(error_msg)
            logging.error(error_msg)
    
    return "\n".join(summary_lines)
