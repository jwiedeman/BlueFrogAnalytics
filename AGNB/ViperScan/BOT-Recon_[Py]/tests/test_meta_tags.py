import requests
from bs4 import BeautifulSoup
import logging

def run_test(target, verbose=True):
    """
    Comprehensive Meta Tags Test with Verbose Logging.

    This test retrieves the HTML content from the provided target (assumed to be a webpage),
    parses the content using BeautifulSoup, and extracts meta tags including:
      - Open Graph (OG) tags (e.g., og:title, og:description, og:image)
      - Twitter meta tags (e.g., twitter:card, twitter:title)
      - Standard meta tags (e.g., description, keywords, author)

    The output includes the total number of meta tags found as well as detailed
    listings for each category.

    Args:
        target (str): The target webpage URL.
        verbose (bool): If True, enables detailed logging.

    Returns:
        str: A detailed summary of the meta tags found.
    """
    # Configure logging based on the verbose flag.
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s"
    )
    logging.debug("Starting Meta Tags Test.")

    # Normalize target: Add scheme if missing.
    if not target.startswith("http://") and not target.startswith("https://"):
        logging.debug("No scheme provided; defaulting to HTTPS.")
        target = "https://" + target
    logging.debug("Normalized target URL: %s", target)

    summary_lines = [f"Meta Tags Test for {target}:"]
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
    meta_tags = soup.find_all("meta")
    total_meta = len(meta_tags)
    logging.debug("Found %d meta tags", total_meta)
    summary_lines.append(f"Total meta tags found: {total_meta}")

    # Dictionaries to store categorized meta tag information.
    og_tags = {}
    twitter_tags = {}
    standard_tags = {}

    for tag in meta_tags:
        # Check for Open Graph tags.
        if tag.has_attr("property") and tag["property"].lower().startswith("og:"):
            og_tags[tag["property"]] = tag.get("content", "").strip()
        # Check for Twitter tags.
        elif tag.has_attr("name") and tag["name"].lower().startswith("twitter:"):
            twitter_tags[tag["name"]] = tag.get("content", "").strip()
        # Check for standard meta tags.
        elif tag.has_attr("name"):
            standard_tags[tag["name"].lower()] = tag.get("content", "").strip()

    if og_tags:
        logging.debug("Open Graph tags found: %d", len(og_tags))
        summary_lines.append("\nOpen Graph (OG) Tags:")
        for key, value in og_tags.items():
            summary_lines.append(f" - {key}: {value}")
    else:
        logging.debug("No Open Graph tags found.")
        summary_lines.append("\nNo Open Graph (OG) Tags found.")

    if twitter_tags:
        logging.debug("Twitter meta tags found: %d", len(twitter_tags))
        summary_lines.append("\nTwitter Meta Tags:")
        for key, value in twitter_tags.items():
            summary_lines.append(f" - {key}: {value}")
    else:
        logging.debug("No Twitter meta tags found.")
        summary_lines.append("\nNo Twitter Meta Tags found.")

    if standard_tags:
        logging.debug("Standard meta tags found: %d", len(standard_tags))
        summary_lines.append("\nStandard Meta Tags:")
        for key, value in standard_tags.items():
            summary_lines.append(f" - {key}: {value}")
    else:
        logging.debug("No standard meta tags found.")
        summary_lines.append("\nNo standard meta tags found.")

    logging.info("Meta Tags Test completed.")
    return "\n".join(summary_lines)
