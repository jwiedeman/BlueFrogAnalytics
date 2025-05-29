import requests
import logging
import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

def run_test(target, verbose=False):
    """
    Comprehensive Compare and Cross-Reference Sitemaps & Robots Test.
    
    This test retrieves the robots.txt file and a sitemap for the provided target.
    It performs the following steps:
      1. Retrieves and parses robots.txt to extract:
         - Disallow directives (preferably from "User-agent: *" blocks).
         - Sitemap directives.
      2. Retrieves the sitemap (using a Sitemap directive from robots.txt if available,
         or falling back to /sitemap.xml).
      3. Parses the sitemap XML to extract URL entries.
      4. Cross-references the sitemap URLs against the Disallow directives from robots.txt,
         flagging any URLs that appear to be disallowed.
    
    Returns a detailed summary including:
      - The contents of robots.txt (Disallow and Sitemap directives).
      - Sitemap details (number of URLs, sample entries).
      - Any discrepancies between robots.txt and sitemap entries.
    """
    # Set up logging.
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s"
    )
    
    # Normalize target: default to HTTPS if no scheme is provided.
    if not target.startswith("http://") and not target.startswith("https://"):
        base_url = "https://" + target.rstrip("/")
    else:
        base_url = target.rstrip("/")
    logging.debug(f"Normalized base URL: {base_url}")
    
    summary_lines = [f"Compare Sitemaps & Robots Test for {base_url}:"]
    
    # Retrieve robots.txt.
    robots_url = urljoin(base_url, "/robots.txt")
    logging.debug(f"Retrieving robots.txt from: {robots_url}")
    try:
        r = requests.get(robots_url, timeout=10)
        if r.status_code == 200:
            robots_text = r.text
            logging.debug("Successfully retrieved robots.txt")
        else:
            summary_lines.append(f"robots.txt not found at {robots_url} (HTTP {r.status_code}).")
            robots_text = ""
    except Exception as e:
        summary_lines.append(f"Error retrieving robots.txt from {robots_url}: {e}")
        robots_text = ""
    
    # Parse robots.txt for Disallow directives and Sitemap directives.
    disallow_paths = []
    sitemap_directives = []
    
    if robots_text:
        # Attempt to isolate blocks for "User-agent: *" for a more targeted scan.
        ua_all_blocks = re.split(r"(?i)User-agent:", robots_text)
        found_block = False
        for block in ua_all_blocks:
            block = block.strip()
            if block.startswith("*"):
                found_block = True
                lines = block.splitlines()
                for line in lines:
                    line = line.strip()
                    if line.lower().startswith("disallow:"):
                        parts = line.split(":", 1)
                        if len(parts) == 2:
                            path = parts[1].strip()
                            if path:  # non-empty disallow
                                disallow_paths.append(path)
                    elif line.lower().startswith("sitemap:"):
                        parts = line.split(":", 1)
                        if len(parts) == 2:
                            sitemap_url = parts[1].strip()
                            sitemap_directives.append(sitemap_url)
        if not found_block:
            logging.debug("No 'User-agent: *' block found; falling back to global scan.")
            for line in robots_text.splitlines():
                line = line.strip()
                if line.lower().startswith("disallow:"):
                    parts = line.split(":", 1)
                    if len(parts) == 2:
                        path = parts[1].strip()
                        if path:
                            disallow_paths.append(path)
                elif line.lower().startswith("sitemap:"):
                    parts = line.split(":", 1)
                    if len(parts) == 2:
                        sitemap_url = parts[1].strip()
                        sitemap_directives.append(sitemap_url)
    else:
        logging.debug("No robots.txt content available.")
    
    if disallow_paths:
        summary_lines.append("Disallowed paths in robots.txt:")
        for path in disallow_paths:
            summary_lines.append(f" - {path}")
    else:
        summary_lines.append("No Disallow directives found in robots.txt.")
    
    if sitemap_directives:
        summary_lines.append("Sitemap directives found in robots.txt:")
        for sitemap in sitemap_directives:
            summary_lines.append(f" - {sitemap}")
    else:
        summary_lines.append("No Sitemap directives found in robots.txt.")
    
    # Determine which sitemap to use.
    if sitemap_directives:
        sitemap_url = sitemap_directives[0]  # Use the first directive.
        summary_lines.append(f"Using sitemap from robots.txt: {sitemap_url}")
    else:
        sitemap_url = urljoin(base_url, "/sitemap.xml")
        summary_lines.append(f"Trying default sitemap URL: {sitemap_url}")
    logging.debug(f"Using sitemap URL: {sitemap_url}")
    
    # Retrieve the sitemap.
    sitemap_content = ""
    try:
        r = requests.get(sitemap_url, timeout=10)
        if r.status_code == 200:
            sitemap_content = r.content
            logging.debug("Successfully retrieved sitemap content.")
        else:
            summary_lines.append(f"Sitemap not found at {sitemap_url} (HTTP {r.status_code}).")
    except Exception as e:
        summary_lines.append(f"Error retrieving sitemap from {sitemap_url}: {e}")
    
    # Parse the sitemap XML for <loc> entries.
    sitemap_urls = []
    if sitemap_content:
        try:
            soup = BeautifulSoup(sitemap_content, "xml")
            loc_tags = soup.find_all("loc")
            for tag in loc_tags:
                url_text = tag.get_text().strip()
                if url_text:
                    sitemap_urls.append(url_text)
            summary_lines.append(f"Sitemap contains {len(sitemap_urls)} URL entries.")
            if sitemap_urls:
                sample_urls = sitemap_urls[:5]
                summary_lines.append("Sample sitemap URLs:")
                for sample in sample_urls:
                    summary_lines.append(f" - {sample}")
        except Exception as e:
            summary_lines.append(f"Error parsing sitemap XML: {e}")
    else:
        summary_lines.append("No sitemap content to parse.")
    
    # Cross-reference: Check if any sitemap URL's path is disallowed by robots.txt.
    discrepancies = []
    for url_entry in sitemap_urls:
        parsed = urlparse(url_entry)
        url_path = parsed.path  # The path portion of the URL.
        for disallowed in disallow_paths:
            if disallowed != "/" and url_path.lower().startswith(disallowed.lower()):
                discrepancies.append((url_entry, disallowed))
                break
    
    if discrepancies:
        summary_lines.append("Discrepancies found (sitemap URLs that appear disallowed in robots.txt):")
        for entry, dis in discrepancies:
            summary_lines.append(f" - {entry} (matches Disallow: {dis})")
    else:
        summary_lines.append("No discrepancies found between robots.txt and sitemap entries.")
    
    return "\n".join(summary_lines)
