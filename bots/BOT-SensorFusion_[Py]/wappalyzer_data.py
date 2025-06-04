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


def load_wappalyzer_data():
    """Return categories and technologies dictionaries from technologies.json."""
    with open(TECHNOLOGIES_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data.get('categories', {}), data.get('technologies', {})


def get_wappalyzer():
    """Return a Wappalyzer instance using the bundled technologies.json."""
    from Wappalyzer import Wappalyzer

    return Wappalyzer.latest(TECHNOLOGIES_PATH)

