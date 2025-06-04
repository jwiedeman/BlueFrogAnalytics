import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
WAPPALYZER_DIR = os.path.join(CURRENT_DIR, '..', '..', 'BOT-wappalyzer[Py]')
LIB_PATH = os.path.join(WAPPALYZER_DIR)
sys.path.insert(0, LIB_PATH)

from Wappalyzer import Wappalyzer, WebPage


def run_test(target):
    """Return detected technologies with versions and categories."""
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
                lines = [f"URL used: {url}"]
                for name, data in results.items():
                    versions = ", ".join(data.get("versions", [])) or "-"
                    cats = ", ".join(data.get("categories", [])) or "-"
                    lines.append(f"{name}: {versions} [{cats}]")
                return "\n".join(lines)
        except Exception:
            continue
    return "No technologies detected"
