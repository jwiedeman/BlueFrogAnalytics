import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.join(CURRENT_DIR, '..')
sys.path.insert(0, BASE_DIR)

import wappalyzer_matcher


def run_test(target):
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
        results = wappalyzer_matcher.detect(url)
        if results and not results.get("error"):
            lines = [f"URL used: {url}"]
            for name, data in results.items():
                cats = ", ".join(data.get("categories", [])) or "-"
                vers = ", ".join(data.get("versions", [])) or "-"
                lines.append(f"{name}: {vers} [{cats}]")
            return "\n".join(lines)
    return str(results) if results else "No technologies detected"

