import os
import json

# Path to Wappalyzer technologies database bundled in BOT-wappalyzer[Py]
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TECHNOLOGIES_PATH = os.path.join(
    BASE_DIR,
    '..',
    'BOT-wappalyzer[Py]',
    'Wappalyzer',
    'data',
    'technologies.json'
)


def load_wappalyzer_data():
    """Return categories and technologies dictionaries from technologies.json."""
    with open(TECHNOLOGIES_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data.get('categories', {}), data.get('technologies', {})

