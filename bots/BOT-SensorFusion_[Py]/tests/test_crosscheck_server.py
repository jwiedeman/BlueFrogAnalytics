import os
import importlib.util
from typing import List

from wappalyzer_data import get_detector


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

    detector = get_detector()
    wapp_servers = set()
    used_url = None

    for url in variants:
        try:
            results = detector.analyze_with_versions_and_categories(url)
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
