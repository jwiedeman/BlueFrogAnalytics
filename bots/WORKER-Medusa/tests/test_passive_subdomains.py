import requests
import logging

def run_test(target, verbose=True):
    """
    Comprehensive Passive Subdomain Gathering Test with Verbose Logging.

    This test uses Certificate Transparency logs via crt.sh to gather subdomains
    for the provided target domain. It queries crt.sh with a wildcard search,
    extracts subdomain entries from the JSON response, deduplicates them, and returns
    a summary including the total number of unique subdomains and a sample list.

    Args:
        target (str): The target domain (e.g., "example.com"). The scheme, if present,
                      will be stripped out.
        verbose (bool): If True, enables detailed logging.
    
    Returns:
        str: A detailed summary of discovered subdomains or an error message.
    """
    # Configure logging based on the verbose flag.
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s"
    )
    logging.debug("Starting Passive Subdomain Gathering Test.")

    # Normalize target: remove any scheme and paths.
    if target.startswith("http://"):
        logging.debug("Stripping 'http://' from target.")
        target = target[len("http://"):]
    elif target.startswith("https://"):
        logging.debug("Stripping 'https://' from target.")
        target = target[len("https://"):]
    domain = target.split("/")[0]
    logging.debug("Normalized domain: %s", domain)
    
    # Build the crt.sh query URL.
    query_url = f"https://crt.sh/?q=%25.{domain}&output=json"
    logging.debug("Constructed crt.sh query URL: %s", query_url)
    
    try:
        logging.debug("Sending GET request to crt.sh.")
        response = requests.get(query_url, timeout=15)
        logging.debug("Received response with status code: %d", response.status_code)
        if response.status_code != 200:
            logging.error("Failed to retrieve data: HTTP Status %d", response.status_code)
            return f"Failed to retrieve data from crt.sh. HTTP Status: {response.status_code}"
        data = response.json()
        logging.debug("JSON data successfully parsed.")
    except Exception as e:
        logging.error("Error querying crt.sh for %s: %s", domain, e)
        return f"Error querying crt.sh for {domain}: {e}"
    
    subdomains = set()
    for entry in data:
        name_value = entry.get("name_value", "")
        if name_value:
            # Each entry may contain multiple subdomains separated by newlines.
            for sub in name_value.split("\n"):
                sub = sub.strip()
                # Remove leading wildcards.
                if sub.startswith("*."):
                    sub = sub[2:]
                if domain in sub:
                    subdomains.add(sub)
    logging.debug("Total unique subdomains deduplicated: %d", len(subdomains))
    
    if not subdomains:
        logging.info("No passive subdomains found for %s.", domain)
        return f"No passive subdomains found for {domain}."
    
    sorted_subdomains = sorted(subdomains)
    total = len(sorted_subdomains)
    sample_list = "\n".join(sorted_subdomains[:10])  # Display up to 10 sample subdomains.
    
    summary = (
        f"Passive Subdomain Gathering for {domain}:\n"
        f"Total Unique Subdomains Found: {total}\n"
        "Sample Subdomains:\n"
        f"{sample_list}"
    )
    
    logging.info("Passive Subdomain Gathering Test completed; %d subdomains found.", total)
    return summary
