import os
import sys

# Add path to the bundled Wappalyzer library
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
WAPPALYZER_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'BOT-wappalyzer[Py]')
LIB_PATH = os.path.join(WAPPALYZER_DIR)
sys.path.insert(0, LIB_PATH)

from Wappalyzer import Wappalyzer, WebPage


def run_test(target):
    """Run Wappalyzer technology detection against the target domain."""
    if not target.startswith("http://") and not target.startswith("https://"):
        variants = [
            f"http://{target}",
            f"https://{target}",
            f"http://www.{target}",
            f"https://www.{target}",
        ]
    else:
        variants = [target]

    wappalyzer = Wappalyzer.latest()
    for url in variants:
        try:
            webpage = WebPage.new_from_url(url)
            results = wappalyzer.analyze_with_versions_and_categories(webpage)
            if results:
                return f"URL used: {url}\nDetected: {results}"
        except Exception:
            continue
    return "No technologies detected"
