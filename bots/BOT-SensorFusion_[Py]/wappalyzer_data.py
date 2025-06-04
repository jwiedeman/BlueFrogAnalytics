import os
import json
import sys

# Path to Wappalyzer technologies database bundled in BOT-wappalyzer[Py]
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WAPPALYZER_DIR = os.path.join(BASE_DIR, '..', 'BOT-wappalyzer[Py]')
LIB_PATH = os.path.join(WAPPALYZER_DIR)
sys.path.insert(0, LIB_PATH)

TECHNOLOGIES_PATH = os.path.join(
    WAPPALYZER_DIR,
    'Wappalyzer',
    'data',
    'technologies.json',
)

# Raw data paths from the Wappalyzer repository
CATEGORIES_PATH = os.path.join(WAPPALYZER_DIR, 'src', 'categories.json')
GROUPS_PATH = os.path.join(WAPPALYZER_DIR, 'src', 'groups.json')


def load_wappalyzer_data():
    """Return categories and technologies dictionaries from technologies.json."""
    with open(TECHNOLOGIES_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data.get('categories', {}), data.get('technologies', {})


def load_full_wappalyzer_data():
    """Return groups, categories and technologies dictionaries."""
    with open(GROUPS_PATH, 'r', encoding='utf-8') as f:
        groups = json.load(f)
    with open(CATEGORIES_PATH, 'r', encoding='utf-8') as f:
        categories = json.load(f)
    with open(TECHNOLOGIES_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    technologies = data.get('technologies', {})
    return groups, categories, technologies


def get_wappalyzer():
    """Return a Wappalyzer instance using the bundled technologies.json."""
    from Wappalyzer import Wappalyzer

    return Wappalyzer.latest(TECHNOLOGIES_PATH)

