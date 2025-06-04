import json
import os
from glob import glob, escape

"""Compile technologies JSON files from Wappalyzer src/technologies."""
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WAPPALYZER_DIR = os.path.join(BASE_DIR, '..', 'BOT-wappalyzer[Py]')
TECH_SRC_DIR = os.path.join(WAPPALYZER_DIR, 'src', 'technologies')
OUTPUT_FILE = os.path.join(BASE_DIR, 'data', 'technologies.json')


def main():
    techs = {}
    for path in sorted(glob(os.path.join(escape(TECH_SRC_DIR), '*.json'))):
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            techs.update(data)

    out_data = {
        "technologies": techs,
    }
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(out_data, f, indent=2, sort_keys=True)
    print(f"Wrote {len(techs)} technologies to {OUTPUT_FILE}")


if __name__ == '__main__':
    main()
