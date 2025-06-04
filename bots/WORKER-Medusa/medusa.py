#!/usr/bin/env python3
"""Medusa all-in-one scanner.

This script orchestrates multiple scanning modules. It can run a full
crawl or execute a subset of scans. Each scan should populate the
columns outlined in db_schema.md.
"""

import argparse
import json
import os
import sys
from typing import Callable, Dict, List

# Allow importing the enrichment worker helpers
ENRICH_PATH = os.path.join(os.path.dirname(__file__), "..", "WORKER-Enrich_processed_domains")
if ENRICH_PATH not in sys.path:
    sys.path.append(ENRICH_PATH)

try:
    from enrich_processed_domain import analyze_target
except Exception:  # pragma: no cover - optional dependency
    analyze_target = None

# Placeholder scan functions. Real implementations should invoke the
# dedicated workers or libraries that perform each scan.

def ssl_scan(domain: str) -> None:
    print(f"[SSL] scanning {domain}")


def whois_scan(domain: str) -> None:
    print(f"[WHOIS] scanning {domain}")


def dns_scan(domain: str) -> None:
    print(f"[DNS] scanning {domain}")


def tech_scan(domain: str) -> None:
    print(f"[TECH] scanning {domain}")


def lighthouse_scan(domain: str) -> None:
    print(f"[Lighthouse] scanning {domain}")


def carbon_scan(domain: str) -> None:
    print(f"[Carbon] scanning {domain}")


def analytics_scan(domain: str) -> None:
    print(f"[Analytics] scanning {domain}")


def webpagetest_scan(domain: str) -> None:
    print(f"[WebPageTest] scanning {domain}")


def enrich_scan(domain: str) -> None:
    """Run the enrichment logic from WORKER-Enrich_processed_domains."""
    if not analyze_target:
        print("Enrichment dependencies not available")
        return
    result = analyze_target(domain)
    print(json.dumps(result, indent=2))


# Mapping of test group name to function
TESTS: Dict[str, Callable[[str], None]] = {
    "ssl": ssl_scan,
    "whois": whois_scan,
    "dns": dns_scan,
    "tech": tech_scan,
    "lighthouse": lighthouse_scan,
    "carbon": carbon_scan,
    "analytics": analytics_scan,
    "webpagetest": webpagetest_scan,
    "enrich": enrich_scan,
}


def run_scans(domain: str, tests: List[str]) -> None:
    for name in tests:
        func = TESTS.get(name)
        if not func:
            print(f"Unknown test: {name}")
            continue
        func(domain)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Medusa scanning engine")
    parser.add_argument("--domain", required=True, help="Target domain")
    parser.add_argument("--tests", help="Comma separated list of tests to run")
    parser.add_argument("--all", action="store_true", help="Run all available tests")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.all:
        tests = list(TESTS.keys())
    elif args.tests:
        tests = [t.strip() for t in args.tests.split(",") if t.strip()]
    else:
        print("No tests specified. Use --all or --tests.")
        return

    run_scans(args.domain, tests)


if __name__ == "__main__":
    main()
