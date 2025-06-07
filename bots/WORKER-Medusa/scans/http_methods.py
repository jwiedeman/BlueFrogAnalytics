import requests
import logging

def run_test(target, verbose=True):
    """
    Comprehensive HTTP Methods Test with Verbose Logging.
    
    This test sends an OPTIONS request to the provided target (assumed to be a domain or URL)
    to determine which HTTP methods are allowed. It retrieves and analyzes the "Allow" header
    from the response, listing methods such as GET, POST, PUT, DELETE, OPTIONS, etc.
    
    Returns a summary that includes:
      - The URL used for the request.
      - The contents of the Allow header (if present).
      - A note if no Allow header is returned.
      
    Note: This test is strictly for legal recon and is designed to be non-intrusive.
    
    Args:
        target (str): The target domain or URL.
        verbose (bool): If True, enables detailed logging.
        
    Returns:
        str: A summary of the HTTP methods allowed.
    """
    # Configure logging based on the verbose flag.
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s"
    )
    
    logging.debug("Starting HTTP Methods Test.")
    
    # Normalize target: default to HTTPS if no scheme is provided.
    if not target.startswith("http://") and not target.startswith("https://"):
        logging.debug("No scheme provided; defaulting to HTTPS.")
        url = "https://" + target
    else:
        url = target
    logging.debug("Normalized URL: %s", url)
    
    try:
        logging.debug("Sending OPTIONS request to %s", url)
        response = requests.options(url, timeout=10)
        logging.debug("Received response with status code: %d", response.status_code)
        allow_header = response.headers.get("Allow", None)
        if allow_header:
            allowed_methods = [method.strip() for method in allow_header.split(",")]
            summary = (
                f"HTTP Methods Test for {url}:\n"
                f"Allowed Methods (from Allow header): {', '.join(allowed_methods)}"
            )
            logging.debug("Allowed methods: %s", allowed_methods)
        else:
            summary = (
                f"HTTP Methods Test for {url}:\nNo 'Allow' header found in the response. "
                "This might indicate that the server does not support an OPTIONS request, or it is configured to hide allowed methods."
            )
            logging.debug("No Allow header found in the response.")
    except Exception as e:
        logging.error("Error during HTTP Methods Test for %s: %s", url, e)
        summary = f"HTTP Methods Test for {url} failed: {e}"
    
    logging.debug("HTTP Methods Test completed.")
    return summary
