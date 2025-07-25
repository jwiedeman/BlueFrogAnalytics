import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.join(CURRENT_DIR, '..')
sys.path.insert(0, BASE_DIR)

import tech_matcher


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
        results = tech_matcher.detect(url)
        if results and not results.get("error"):
            lines = [f"URL used: {url}"]
            for name, data in results.items():
                cats = ", ".join(data.get("categories", [])) or "-"
                grps = ", ".join(data.get("groups", [])) or "-"
                vers = ", ".join(data.get("versions", [])) or "-"
                lines.append(f"{name}: {vers} [{cats}] <{grps}>")
            return "\n".join(lines)
    return str(results) if results else "No technologies detected"

