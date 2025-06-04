from wappalyzer_data import get_detector


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

    detector = get_detector()
    for url in variants:
        try:
            results = detector.analyze_with_versions_and_categories(url)
            if results:
                return f"URL used: {url}\nDetected: {results}"
        except Exception:
            continue
    return "No technologies detected"
