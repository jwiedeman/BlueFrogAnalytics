import requests
import logging

def run_test(target, verbose=True):
    """
    Comprehensive Directory Enumeration Test with Verbose Logging.
    
    This test attempts to enumerate common directories on the target website by sending HTTP GET requests
    to a list of predefined paths (e.g., /admin, /login, /backup). For each directory, it captures the HTTP
    status code and a brief snippet of the response content. This information can help identify potential
    areas of interest while ensuring that the recon remains passive and legal.
    
    Verbose logging is enabled by default and logs detailed steps during the enumeration process.
    
    Args:
        target (str): The target domain or URL.
        verbose (bool): If True, detailed logging is enabled.
        
    Returns:
        str: A detailed summary of the directory enumeration results.
    """
    # Configure logging based on the verbose flag.
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s"
    )
    
    logging.debug("Starting Directory Enumeration Test.")
    
    # Normalize the target: default to HTTPS if no scheme is provided.
    if not target.startswith("http://") and not target.startswith("https://"):
        logging.debug("No scheme provided; defaulting to HTTPS.")
        base_url = "https://" + target.rstrip("/")
    else:
        base_url = target.rstrip("/")
    
    logging.debug("Normalized base URL: %s", base_url)
    summary_lines = [f"Directory Enumeration Test for {base_url}:"]
    
    # List of common directories to check.
    common_directories = [
        "/admin",
        "/login",
        "/backup",
        "/test",
        "/config",
        "/private",
        "/data",
        "/.git",
        "/uploads",
        "/secret"
    ]
    
    for directory in common_directories:
        url = base_url + directory
        logging.debug("Attempting to access directory: %s", url)
        try:
            response = requests.get(url, timeout=10)
            snippet = response.text.strip()[:100].replace("\n", " ")
            logging.debug("Directory %s returned status code %d", directory, response.status_code)
            logging.debug("Content snippet: %s", snippet)
            summary_lines.append(f"Directory: {directory} - HTTP Status: {response.status_code} - Content Snippet: {snippet}")
        except Exception as e:
            logging.error("Error accessing directory %s: %s", directory, e)
            summary_lines.append(f"Directory: {directory} - Error: {e}")
    
    logging.info("Directory Enumeration Test completed.")
    return "\n".join(summary_lines)
