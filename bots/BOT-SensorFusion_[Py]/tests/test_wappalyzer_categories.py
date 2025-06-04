import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
WAPPALYZER_DIR = os.path.join(CURRENT_DIR, '..', '..', 'BOT-wappalyzer[Py]')
LIB_PATH = os.path.join(WAPPALYZER_DIR)
sys.path.insert(0, LIB_PATH)

from Wappalyzer import WebPage

BASE_DIR = os.path.join(CURRENT_DIR, '..')
sys.path.insert(0, BASE_DIR)

import wappalyzer_data

wap = wappalyzer_data.get_wappalyzer()
groups, categories, _ = wappalyzer_data.load_full_wappalyzer_data()


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

    for url in variants:
        try:
            webpage = WebPage.new_from_url(url)
            results = wap.analyze_with_versions_and_categories(webpage)
            if results:
                lines = [f"URL used: {url}"]
                for name, data in results.items():
                    versions = ", ".join(data.get("versions", [])) or "-"
                    cats = ", ".join(data.get("categories", [])) or "-"
                    grp_names = []
                    for c in data.get("categories", []):
                        cat = next((k for k, v in categories.items() if v.get("name") == c), None)
                        if cat:
                            for gid in categories[cat].get("groups", []):
                                gname = groups.get(str(gid), {}).get("name")
                                if gname:
                                    grp_names.append(gname)
                    grps = ", ".join(sorted(set(grp_names))) or "-"
                    lines.append(f"{name}: {versions} [{cats}] <{grps}>")
                return "\n".join(lines)
        except Exception:
            continue
    return "No technologies detected"
