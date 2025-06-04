import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.join(CURRENT_DIR, '..')
sys.path.insert(0, BASE_DIR)

WAPPALYZER_DIR = os.path.join(BASE_DIR, '..', 'BOT-wappalyzer[Py]')
sys.path.insert(0, WAPPALYZER_DIR)

from Wappalyzer import WebPage

import wappalyzer_data
import wappalyzer_matcher

wap = wappalyzer_data.get_wappalyzer()


def run_test(target):
    """Compare results from the official Wappalyzer library and the bundled matcher."""
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
            page = WebPage.new_from_url(url)
            lib_res = wap.analyze_with_versions_and_categories(page)
            match_res = wappalyzer_matcher.detect(url)
            if lib_res:
                lines = [f"URL used: {url}"]
                lib_names = sorted(lib_res.keys())
                match_names = [k for k in match_res.keys() if k != "error"] if match_res else []
                lines.append(f"Library: {', '.join(lib_names)}")
                if match_res and not match_res.get("error"):
                    lines.append(f"Matcher: {', '.join(sorted(match_names))}")
                    common = sorted(set(lib_names) & set(match_names))
                    lines.append(f"Overlap: {', '.join(common) if common else 'None'}")
                else:
                    lines.append("Matcher: None")
                return "\n".join(lines)
        except Exception:
            continue
    return "No technologies detected"
