import re
import requests
from typing import Dict, Any

from wappalyzer_data import load_wappalyzer_data

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/115.0 Safari/537.36"
)


def _compile_list(value):
    if isinstance(value, list):
        return [re.compile(v, re.I) for v in value]
    if value:
        return [re.compile(value, re.I)]
    return []


def detect(url: str) -> Dict[str, Any]:
    """Basic matcher using Wappalyzer patterns without the Wappalyzer library."""
    categories, technologies = load_wappalyzer_data()

    try:
        resp = requests.get(url, timeout=10, headers={"User-Agent": USER_AGENT})
    except Exception as exc:
        return {"error": f"Request failed: {exc}"}

    html = resp.text
    headers = resp.headers

    found = {}
    for tech_name, tech in technologies.items():
        matched = False

        hdr_patterns = tech.get("headers", {})
        for header, pattern in hdr_patterns.items():
            header_val = headers.get(header)
            if header_val and re.search(pattern, header_val, re.I):
                matched = True
                break
        if not matched:
            for pattern in _compile_list(tech.get("html")):
                if pattern.search(html):
                    matched = True
                    break
        if not matched:
            for pattern in _compile_list(tech.get("scripts")):
                if pattern.search(html):
                    matched = True
                    break

        if matched:
            cat_names = [categories.get(str(c), {}).get("name", str(c)) for c in tech.get("cats", [])]
            found[tech_name] = {"categories": cat_names}
    return found
