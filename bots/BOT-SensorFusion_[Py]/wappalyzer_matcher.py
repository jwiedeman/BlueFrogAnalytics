import re
from typing import Any, Dict, List

import requests
from bs4 import BeautifulSoup

from wappalyzer_data import load_wappalyzer_data

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/115.0 Safari/537.36"
)


def _compile_list(value: Any) -> List[re.Pattern]:
    """Return a list of compiled regex patterns from a value."""
    if isinstance(value, list):
        return [re.compile(v, re.I) for v in value]
    if value:
        return [re.compile(value, re.I)]
    return []


def _prepare_pattern(pattern: str) -> Dict[str, Any]:
    """Parse a Wappalyzer pattern string into regex and attributes."""
    attrs: Dict[str, Any] = {}
    parts = pattern.split(";")
    attrs["regex"] = re.compile(parts[0], re.I)
    for part in parts[1:]:
        if ":" in part:
            key, val = part.split(":", 1)
            attrs[key] = val
    return attrs


def _extract_version(attr: Dict[str, Any], match: re.Match) -> str:
    """Return version string if present in pattern attributes."""
    version = attr.get("version")
    if not version:
        return ""
    for idx, group in enumerate(match.groups(), 1):
        version = version.replace(f"\\{idx}", group or "")
    return version


def detect(url: str) -> Dict[str, Any]:
    """Basic matcher using Wappalyzer patterns without the Wappalyzer library."""
    categories, technologies = load_wappalyzer_data()

    try:
        resp = requests.get(url, timeout=10, headers={"User-Agent": USER_AGENT})
    except Exception as exc:
        return {"error": f"Request failed: {exc}"}

    html = resp.text
    soup = BeautifulSoup(html, "lxml")
    scripts = [s.get("src", "") for s in soup.find_all("script", src=True)]
    meta = {m.get("name", "").lower(): m.get("content", "") for m in soup.find_all("meta", attrs={"name": True, "content": True})}
    headers = {k.lower(): v for k, v in resp.headers.items()}
    cookies = {c.name.lower(): c.value for c in resp.cookies}

    detected: Dict[str, Dict[str, Any]] = {}

    def matches(tech: Dict[str, Any]) -> str | None:
        # URL patterns
        for pattern in _compile_list(tech.get("url")):
            m = pattern.search(url)
            if m:
                return _extract_version({}, m)

        for name, pat in tech.get("headers", {}).items():
            header_val = headers.get(name.lower())
            if header_val:
                attr = _prepare_pattern(pat)
                m = attr["regex"].search(header_val)
                if m:
                    return _extract_version(attr, m)

        for name, pat in tech.get("cookies", {}).items():
            cookie_val = cookies.get(name.lower())
            if cookie_val is not None:
                if not pat:
                    return ""
                attr = _prepare_pattern(pat)
                m = attr["regex"].search(cookie_val)
                if m:
                    return _extract_version(attr, m)

        for name, pat in tech.get("meta", {}).items():
            meta_val = meta.get(name.lower())
            if meta_val:
                attr = _prepare_pattern(pat)
                m = attr["regex"].search(meta_val)
                if m:
                    return _extract_version(attr, m)

        for pattern in _compile_list(tech.get("scripts")):
            comp = _prepare_pattern(pattern.pattern if isinstance(pattern, re.Pattern) else pattern)
            for src in scripts:
                m = comp["regex"].search(src)
                if m:
                    return _extract_version(comp, m)

        for pattern in _compile_list(tech.get("html")):
            attr = _prepare_pattern(pattern.pattern if isinstance(pattern, re.Pattern) else pattern)
            m = attr["regex"].search(html)
            if m:
                return _extract_version(attr, m)

        return None

    matched = set()
    for tech_name, tech in technologies.items():
        version = matches(tech)
        if version is not None:
            matched.add(tech_name)
            if version:
                detected[tech_name] = {"versions": [version]}

    # include implied technologies
    queue = list(matched)
    while queue:
        name = queue.pop()
        tech = technologies.get(name, {})
        implies = tech.get("implies", [])
        if isinstance(implies, str):
            implies = [implies]
        for item in implies:
            m = re.match(r"([^;]+);confidence:(\d+)", item)
            if m:
                if int(m.group(2)) >= 50:
                    implied = m.group(1)
                else:
                    continue
            else:
                implied = item
            if implied not in matched:
                matched.add(implied)
                queue.append(implied)

    for tech_name in matched:
        tech = technologies.get(tech_name, {})
        entry = detected.get(tech_name, {})
        entry["categories"] = [
            categories.get(str(c), {}).get("name", str(c))
            for c in tech.get("cats", [])
        ]
        detected[tech_name] = entry

    return detected
