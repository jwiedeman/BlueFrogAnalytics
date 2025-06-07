import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
import logging

def run_test(target, verbose=True):
    """
    Comprehensive External Resources Test with Verbose Logging.
    
    This test retrieves the HTML content from the provided target URL and parses the page
    for various external resource references. It extracts:
      - Scripts
      - Stylesheets
      - Images
      - Iframes
      - Videos
      
    For each resource, the URL is normalized and compared to the target domain to determine
    if it is external. The test returns a detailed summary including a count and sample URLs
    for each resource type found.
    
    Args:
        target (str): The target URL.
        verbose (bool): If True, enables detailed logging.
        
    Returns:
        str: A detailed summary of the external resource findings.
    """
    # Configure logging based on the verbose flag.
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s"
    )
    
    logging.debug("Starting External Resources Test.")
    
    # Normalize target: add scheme if missing.
    if not target.startswith("http://") and not target.startswith("https://"):
        logging.debug("No scheme provided; defaulting to HTTPS.")
        target = "https://" + target
    logging.debug("Normalized target URL: %s", target)
    
    parsed_target = urlparse(target)
    target_domain = parsed_target.netloc
    logging.debug("Parsed target domain: %s", target_domain)
    
    summary_lines = [f"External Resources Test for {target}:"]
    
    try:
        logging.debug("Sending GET request to %s", target)
        response = requests.get(target, timeout=10)
        logging.debug("Received response with status code: %d", response.status_code)
        if response.status_code != 200:
            logging.error("Non-200 status code received: %d", response.status_code)
            return f"Failed to retrieve webpage. HTTP Status: {response.status_code}"
        html = response.text
    except Exception as e:
        logging.error("Error retrieving webpage: %s", e)
        return f"Error retrieving webpage: {e}"
    
    soup = BeautifulSoup(html, "html.parser")
    
    # Define external resource types and their identifying attributes.
    resources = {
        "Scripts": {"tag": "script", "attr": "src"},
        "Stylesheets": {"tag": "link", "attr": "href", "filter": lambda tag: tag.get("rel") and "stylesheet" in tag.get("rel")},
        "Images": {"tag": "img", "attr": "src"},
        "Iframes": {"tag": "iframe", "attr": "src"},
        "Videos": {"tag": "video", "attr": "src"}
    }
    
    external_resources = {}
    
    for resource_type, info in resources.items():
        logging.debug("Processing resource type: %s", resource_type)
        resource_list = []
        if "filter" in info:
            # Use filter function for specific tag attributes (e.g., stylesheet rel).
            tags = soup.find_all(info["tag"], attrs={"rel": "stylesheet"})
            logging.debug("Found %d %s tags with rel='stylesheet'.", len(tags), resource_type)
        else:
            tags = soup.find_all(info["tag"])
            logging.debug("Found %d %s tags.", len(tags), resource_type)
        
        for tag in tags:
            url_attr = tag.get(info["attr"])
            if url_attr:
                resource_url = urljoin(target, url_attr)
                parsed_resource = urlparse(resource_url)
                # Consider a resource external if its netloc is set and is different from the target's domain.
                if parsed_resource.netloc and parsed_resource.netloc != target_domain:
                    logging.debug("Identified external %s: %s", resource_type, resource_url)
                    resource_list.append(resource_url)
        
        if resource_list:
            external_resources[resource_type] = resource_list
            logging.debug("Total external %s found: %d", resource_type, len(resource_list))
    
    if not external_resources:
        summary_lines.append("No external resources found.")
        logging.info("No external resources found.")
    else:
        for resource_type, urls in external_resources.items():
            summary_lines.append(f"\n{resource_type} (Total Found: {len(urls)}):")
            # Show up to 5 sample URLs per resource type.
            sample_urls = urls[:5]
            for url in sample_urls:
                summary_lines.append(f" - {url}")
            logging.info("Added summary for %s: %d external URLs.", resource_type, len(urls))
    
    logging.info("External Resources Test completed.")
    return "\n".join(summary_lines)
