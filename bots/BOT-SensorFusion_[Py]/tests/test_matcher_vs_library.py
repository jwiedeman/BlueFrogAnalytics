import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.join(CURRENT_DIR, '..')
sys.path.insert(0, BASE_DIR)

import wappalyzer_data
import wappalyzer_matcher


def run_test(target):
    """Run the custom matcher and list detected technologies."""
    if not target.startswith("http://") and not target.startswith("https://"):
        variants = [
            f"http://{target}",
            f"https://{target}",
            f"http://www.{target}",
            f"https://www.{target}",
        ]
    else:
        variants = [target]

    for url in variants:
        try:
            results = wappalyzer_matcher.detect(url)
            if results and not results.get("error"):
                names = [k for k in results.keys()]
                lines = [f"URL used: {url}", f"Detected: {', '.join(sorted(names))}"]
                return "\n".join(lines)
        except Exception:
            continue
    return "No technologies detected"
