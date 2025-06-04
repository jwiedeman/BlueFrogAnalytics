import os
import json
from typing import Any, Dict


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Paths to the bundled technology database. The full JSON files live under
# ``data/`` and must be present before running any detection.
DATA_DIR = os.path.join(BASE_DIR, 'data')
TECHNOLOGIES_PATH = os.path.join(DATA_DIR, 'technologies.json')
CATEGORIES_PATH = os.path.join(DATA_DIR, 'categories.json')
GROUPS_PATH = os.path.join(DATA_DIR, 'groups.json')

if not os.path.exists(TECHNOLOGIES_PATH):
    raise FileNotFoundError(
        'Missing technologies.json. Run scripts/compile_tech_data.py to '
        'generate the dataset.'
    )


def load_tech_data():
    """Return categories and technologies dictionaries from technologies.json."""
    with open(TECHNOLOGIES_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data.get('categories', {}), data.get('technologies', {})


def load_full_tech_data():
    """Return groups, categories and technologies dictionaries."""
    with open(GROUPS_PATH, 'r', encoding='utf-8') as f:
        groups = json.load(f)
    with open(CATEGORIES_PATH, 'r', encoding='utf-8') as f:
        categories = json.load(f)
    with open(TECHNOLOGIES_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    technologies = data.get('technologies', {})
    return groups, categories, technologies


class FastDetector:
    """Simple wrapper providing a lightweight detection interface."""

    def analyze_with_versions_and_categories(self, url: str) -> Dict[str, Any]:
        """Detect technologies on ``url`` using the custom matcher."""
        # Import here to avoid a circular dependency when this module is
        # imported by ``tech_matcher``.
        import tech_matcher

        return tech_matcher.detect(url)


def get_detector() -> FastDetector:
    """Return a detector instance using the bundled dataset."""
    return FastDetector()

