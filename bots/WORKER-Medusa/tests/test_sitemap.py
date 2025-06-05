import requests
from bs4 import BeautifulSoup

def run_test(target):
    """
    Comprehensive Sitemap Test.

    This test checks for the presence of one or more sitemaps on the provided target.
    It attempts to retrieve standard and alternative sitemap URLs, parses the XML,
    and extracts URLs found within. It returns a detailed summary of the findings,
    including HTTP status codes, number of URLs discovered, and sample entries.
    """
    # Normalize target: Add scheme if missing.
    if not target.startswith("http://") and not target.startswith("https://"):
        target = "https://" + target

    # Define a list of common sitemap paths.
    sitemap_paths = [
        "/sitemap.xml",
        "/sitemap_index.xml",
        "/sitemap-index.xml",
        "/sitemap_en.xml",
        "/sitemap1.xml"
    ]

    summary_lines = []
    found_any = False

    for path in sitemap_paths:
        sitemap_url = target.rstrip("/") + path
        try:
            response = requests.get(sitemap_url, timeout=10)
            if response.status_code == 200:
                found_any = True
                summary_lines.append(f"Found sitemap at: {sitemap_url} (Status: {response.status_code})")
                # Parse the XML content.
                soup = BeautifulSoup(response.content, "xml")
                # Determine if it's a sitemap index or a URL set.
                if soup.find("sitemapindex"):
                    loc_tags = soup.find_all("loc")
                    summary_lines.append(f" - Sitemap Index contains {len(loc_tags)} sitemap entries.")
                    sample_entries = [loc.text.strip() for loc in loc_tags[:3]]
                    summary_lines.append("   Sample sitemap URLs: " + ", ".join(sample_entries))
                elif soup.find("urlset"):
                    loc_tags = soup.find_all("loc")
                    summary_lines.append(f" - Sitemap URL set contains {len(loc_tags)} URL entries.")
                    sample_entries = [loc.text.strip() for loc in loc_tags[:3]]
                    summary_lines.append("   Sample URLs: " + ", ".join(sample_entries))
                else:
                    summary_lines.append(" - Sitemap format unrecognized.")
            else:
                summary_lines.append(f"No sitemap at: {sitemap_url} (Status: {response.status_code})")
        except Exception as e:
            summary_lines.append(f"Error accessing {sitemap_url}: {e}")

    if not found_any:
        summary_lines.insert(0, "No sitemaps found on the target.")
    return "\n".join(summary_lines)
