#!/usr/bin/env python3
"""Compare custom detector results with the Wappalyzer library.

This helper runs the built-in matcher on a URL and then executes the
Wappalyzer library to detect additional technologies. Any technologies
present in the Wappalyzer output but missing from the custom detector
are listed for review. A Selenium WebDriver must be available in PATH
for Wappalyzer to operate.
"""
import sys
from tech_data import get_detector

try:
    from Wappalyzer import Wappalyzer, WebPage
except Exception as exc:  # pragma: no cover - library may be missing
    Wappalyzer = None  # type: ignore
    WebPage = None
    LOAD_ERROR = exc
else:
    LOAD_ERROR = None


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python compare_with_wappalyzer.py <url> [confidence]")
        return

    url = sys.argv[1]
    try:
        min_conf = int(sys.argv[2])
    except (IndexError, ValueError):
        min_conf = 150

    detector = get_detector()
    custom = detector.analyze_with_versions_and_categories(
        url, min_confidence=min_conf
    )

    custom_set = set(custom.keys())

    wapp_res = {}
    if LOAD_ERROR is not None:
        print(f"Wappalyzer library not available: {LOAD_ERROR}")
    else:
        try:
            wapp = Wappalyzer.latest()
            webpage = WebPage.new_from_url(url)
            wapp_res = wapp.analyze_with_versions_and_categories(webpage)
        except Exception as exc:  # pragma: no cover - runtime issues
            print(f"Wappalyzer failed: {exc}")
            wapp_res = {}

    wapp_set = set(wapp_res.keys())
    missing = sorted(wapp_set - custom_set)

    print("Custom detector:")
    for tech in sorted(custom_set):
        print(f" - {tech}")

    print("\nWappalyzer:")
    for tech in sorted(wapp_set):
        print(f" - {tech}")

    if missing:
        print("\nTechnologies missing from custom detector:")
        for tech in missing:
            print(f" * {tech}")
    else:
        print("\nNo missing technologies detected.")


if __name__ == "__main__":
    main()
