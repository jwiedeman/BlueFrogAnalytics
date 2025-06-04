import re
from typing import Any, Dict, List

import requests
from bs4 import BeautifulSoup, FeatureNotFound

from tech_data import load_full_tech_data
import dns.resolver
from urllib.parse import urlparse

_GROUPS = None
_CATEGORIES = None
_TECHNOLOGIES = None


def _load_data() -> None:
    """Load technology data once and cache it globally."""
    global _GROUPS, _CATEGORIES, _TECHNOLOGIES
    if _TECHNOLOGIES is None:
        _GROUPS, _CATEGORIES, _TECHNOLOGIES = load_full_tech_data()

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/115.0 Safari/537.36"
)


def _compile_patterns(value: Any) -> List[Dict[str, Any]]:
    """Return a list of prepared pattern dictionaries from a value."""
    if isinstance(value, list):
        patterns = [p for p in value if p]
    elif value:
        patterns = [value]
    else:
        return []
    return [_prepare_pattern(p) for p in patterns if p]


def _prepare_pattern(pattern: str) -> Dict[str, Any]:
    """Parse a technology pattern string into regex and attributes."""
    attrs: Dict[str, Any] = {}
    if not pattern:
        attrs["regex"] = None
        return attrs
    parts = pattern.split(";")
    try:
        attrs["regex"] = re.compile(parts[0], re.I)
    except re.error:
        attrs["regex"] = re.compile(re.escape(parts[0]))
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
    """Basic matcher using the bundled patterns without the external library."""
    _load_data()
    groups, categories, technologies = _GROUPS, _CATEGORIES, _TECHNOLOGIES

    try:
        resp = requests.get(url, timeout=10, headers={"User-Agent": USER_AGENT})
    except Exception as exc:
        return {"error": f"Request failed: {exc}"}

    html = resp.text
    try:
        soup = BeautifulSoup(html, "lxml")
    except FeatureNotFound:
        soup = BeautifulSoup(html, "html.parser")
    scripts = [s.get("src", "") for s in soup.find_all("script", src=True)]
    inline_scripts = [s.get_text() for s in soup.find_all("script") if not s.get("src")]
    meta = {m.get("name", "").lower(): m.get("content", "") for m in soup.find_all("meta", attrs={"name": True, "content": True})}
    headers = {k.lower(): v for k, v in resp.headers.items()}
    cookies = {c.name.lower(): c.value for c in resp.cookies}
    parsed = urlparse(url)
    hostname = parsed.hostname or parsed.path.split("/")[0]

    detected: Dict[str, Dict[str, Any]] = {}
    confidence_totals: Dict[str, int] = {}

    def matches(name: str, tech: Dict[str, Any]) -> tuple[str, int]:
        version = ""
        conf = 0

        # URL patterns
        for pat in _compile_patterns(tech.get("url")):
            m = pat["regex"].search(url)
            if m:
                conf += int(pat.get("confidence", "100"))
                if not version:
                    version = _extract_version(pat, m)

        for name, pat in tech.get("headers", {}).items():
            header_val = headers.get(name.lower())
            if header_val:
                attr = _prepare_pattern(pat)
                regex = attr.get("regex")
                if regex is not None:
                    m = regex.search(header_val)
                    if m:
                        conf += int(attr.get("confidence", "100"))
                        if not version:
                            version = _extract_version(attr, m)

        for name, pat in tech.get("cookies", {}).items():
            cookie_val = cookies.get(name.lower())
            if cookie_val is not None:
                if not pat:
                    conf += 100
                    continue
                attr = _prepare_pattern(pat)
                regex = attr.get("regex")
                if regex is not None:
                    m = regex.search(cookie_val)
                    if m:
                        conf += int(attr.get("confidence", "100"))
                        if not version:
                            version = _extract_version(attr, m)

        for name, pat in tech.get("meta", {}).items():
            meta_val = meta.get(name.lower())
            if meta_val:
                attr = _prepare_pattern(pat)
                regex = attr.get("regex")
                if regex is not None:
                    m = regex.search(meta_val)
                    if m:
                        conf += int(attr.get("confidence", "100"))
                        if not version:
                            version = _extract_version(attr, m)

        for pat in _compile_patterns(tech.get("scripts") or tech.get("scriptSrc")):
            for src in scripts:
                regex = pat.get("regex")
                if regex is not None:
                    m = regex.search(src)
                    if m:
                        conf += int(pat.get("confidence", "100"))
                        if not version:
                            version = _extract_version(pat, m)

        js_text = "\n".join(inline_scripts)
        for name, pat in tech.get("js", {}).items():
            if not pat:
                continue
            attr = _prepare_pattern(pat)
            regex = attr.get("regex")
            if regex is not None:
                m = regex.search(js_text)
                if m:
                    conf += int(attr.get("confidence", "100"))
                    if not version:
                        version = _extract_version(attr, m)

        dom = tech.get("dom")
        if dom:
            if isinstance(dom, list):
                for selector in dom:
                    try:
                        matched_el = soup.select_one(selector)
                    except Exception:
                        matched_el = None
                    if matched_el:
                        conf += 100
                        version = version or ""
                        break
            elif isinstance(dom, dict):
                for selector, cond in dom.items():
                    try:
                        elements = soup.select(selector)
                    except Exception:
                        elements = []
                    if not elements:
                        continue
                    if isinstance(cond, dict):
                        if "exists" in cond:
                            conf += 100
                            break
                        attrs = cond.get("attributes", {})
                        for el in elements:
                            matched = True
                            for aname, pattern in attrs.items():
                                aval = el.get(aname)
                                if aval is None:
                                    matched = False
                                    break
                                if pattern and not re.search(pattern, aval, re.I):
                                    matched = False
                                    break
                            if matched:
                                conf += 100
                                break
                    else:
                        attr = _prepare_pattern(str(cond))
                        regex = attr.get("regex")
                        if regex is None:
                            continue
                        for el in elements:
                            m = regex.search(el.text)
                            if m:
                                conf += int(attr.get("confidence", "100"))
                                if not version:
                                    version = _extract_version(attr, m)
                                break

        for pat in _compile_patterns(tech.get("html")):
            regex = pat.get("regex")
            if regex is not None:
                m = regex.search(html)
                if m:
                    conf += int(pat.get("confidence", "100"))
                    if not version:
                        version = _extract_version(pat, m)

        for rtype, patterns in tech.get("dns", {}).items():
            if not isinstance(patterns, list):
                patterns = [patterns]
            try:
                answers = dns.resolver.resolve(hostname, rtype, lifetime=3)
                records = [a.to_text() for a in answers]
            except Exception:
                continue
            for pat_str in patterns:
                pat = _prepare_pattern(pat_str)
                for rec in records:
                    regex = pat.get("regex")
                    if regex is not None:
                        m = regex.search(rec)
                        if m:
                            conf += int(pat.get("confidence", "100"))
                            if not version:
                                version = _extract_version(pat, m)

        return version, conf

    matched = set()
    for tech_name, tech in technologies.items():
        version, conf = matches(tech_name, tech)
        if version or conf:
            matched.add(tech_name)
            if version:
                detected[tech_name] = {"versions": [version]}
            if conf:
                confidence_totals[tech_name] = conf

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

    # apply requires/excludes logic
    matched_categories = set()
    for t in matched:
        for cat in technologies.get(t, {}).get("cats", []):
            matched_categories.add(cat)

    final_matched = set(matched)
    for tech_name in list(matched):
        tech = technologies.get(tech_name, {})

        reqs = tech.get("requires", [])
        if isinstance(reqs, str):
            reqs = [reqs]
        for r in reqs:
            if r not in matched:
                final_matched.discard(tech_name)
                break

        if tech_name in final_matched:
            req_cats = tech.get("requiresCategory", [])
            if isinstance(req_cats, int):
                req_cats = [req_cats]
            for rc in req_cats:
                if rc not in matched_categories:
                    final_matched.discard(tech_name)
                    break

        if tech_name in final_matched:
            excl = tech.get("excludes", [])
            if isinstance(excl, str):
                excl = [excl]
            for e in excl:
                if e in matched:
                    final_matched.discard(tech_name)
                    break

        if tech_name in final_matched:
            excl_cats = tech.get("excludesCategory", [])
            if isinstance(excl_cats, int):
                excl_cats = [excl_cats]
            for ec in excl_cats:
                if ec in matched_categories:
                    final_matched.discard(tech_name)
                    break

    matched = final_matched

    for tech_name in matched:
        tech = technologies.get(tech_name, {})
        entry = detected.get(tech_name, {})
        if tech_name in confidence_totals:
            entry["confidence"] = confidence_totals[tech_name]
        cat_names = []
        grp_names = []
        for c in tech.get("cats", []):
            cat = categories.get(str(c), {})
            cat_name = cat.get("name", str(c))
            cat_names.append(cat_name)
            for gid in cat.get("groups", []):
                gname = groups.get(str(gid), {}).get("name")
                if gname:
                    grp_names.append(gname)
        if cat_names:
            entry["categories"] = cat_names
        if grp_names:
            entry["groups"] = sorted(set(grp_names))
        detected[tech_name] = entry

    return detected
