import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.join(CURRENT_DIR, '..')
sys.path.insert(0, BASE_DIR)

import wappalyzer_data


def run_test(target):
    """Use the helper to load Wappalyzer data and fingerprint the site."""
    groups, cats, techs = wappalyzer_data.load_full_wappalyzer_data()
    detector = wappalyzer_data.get_detector()

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
            results = detector.analyze_with_versions_and_categories(url)
            if results:
                header = (
                    f"URL used: {url}"\
                    + f"\nGroups loaded: {len(groups)}"\
                    + f"\nCategories loaded: {len(cats)}"\
                    + f"\nTechnologies loaded: {len(techs)}"
                )
                return header + "\nDetected: " + str(results)
        except Exception:
            continue
    return (
        f"Groups loaded: {len(groups)}"\
        + f"\nCategories loaded: {len(cats)}"\
        + f"\nTechnologies loaded: {len(techs)}"\
        + "\nNo technologies detected"
    )
