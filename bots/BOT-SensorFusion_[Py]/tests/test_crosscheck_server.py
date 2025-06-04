import os
import importlib.util
from typing import List

# Add path to the bundled Wappalyzer library
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
WAPPALYZER_DIR = os.path.join(CURRENT_DIR, '..', '..', 'BOT-wappalyzer[Py]')
LIB_PATH = os.path.join(WAPPALYZER_DIR)

import sys
sys.path.insert(0, LIB_PATH)

from Wappalyzer import Wappalyzer, WebPage


def _load_recon_server_module():
    """Dynamically load the server fingerprinting test from BOT-Recon_[Py]."""
    recon_test_path = os.path.join(CURRENT_DIR, '..', '..', 'BOT-Recon_[Py]', 'tests', 'test_server_fingerprinting.py')
    spec = importlib.util.spec_from_file_location('server_fingerprinting', recon_test_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _extract_sf_detections(result: str) -> List[str]:
    """Parse server fingerprinting output for detected servers/frameworks."""
    for line in result.splitlines():
        if line.startswith('Detected Server/Frameworks:'):
            return [s.strip() for s in line.split(':', 1)[1].split(',') if s.strip()]
    return []


def run_test(target):
    """Compare server detections between Wappalyzer and server_fingerprinting."""
    if not target.startswith('http://') and not target.startswith('https://'):
        variants = [
            f"http://{target}",
            f"https://{target}",
            f"http://www.{target}",
            f"https://www.{target}",
        ]
    else:
        variants = [target]

    wappalyzer = Wappalyzer.latest()
    wapp_servers = set()
    used_url = None

    for url in variants:
        try:
            webpage = WebPage.new_from_url(url)
            results = wappalyzer.analyze_with_versions_and_categories(webpage)
            if results:
                used_url = url
                for name, data in results.items():
                    if 'Web servers' in data.get('categories', []):
                        wapp_servers.add(name)
                if wapp_servers:
                    break
        except Exception:
            continue

    server_module = _load_recon_server_module()
    sf_output = server_module.run_test(target)
    sf_servers = _extract_sf_detections(sf_output)

    common = sorted(set(sf_servers) & wapp_servers)

    result_lines = [
        f"URL used: {used_url if used_url else target}",
        f"Wappalyzer servers: {', '.join(sorted(wapp_servers)) if wapp_servers else 'None'}",
        f"Server fingerprinting: {', '.join(sf_servers) if sf_servers else 'None'}",
        f"Overlap: {', '.join(common) if common else 'None'}",
    ]
    return "\n".join(result_lines)
