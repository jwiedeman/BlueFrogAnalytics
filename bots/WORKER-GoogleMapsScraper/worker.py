import os
import csv
import random
import sys
import time
from playwright.sync_api import sync_playwright

# Usage: worker.py "term1;term2" total output_path

TERMS = [t.strip() for t in (sys.argv[1] if len(sys.argv) > 1 else '').split(';') if t.strip()]
TOTAL = int(sys.argv[2]) if len(sys.argv) > 2 else 10
OUT = sys.argv[3] if len(sys.argv) > 3 else 'output/maps.csv'

LOCATIONS = [l.strip() for l in os.environ.get('MAPS_LOCATIONS', 'US').split(';') if l.strip()]

FIELDNAMES = [
    'name', 'address', 'website', 'phone', 'reviews_average',
    'query', 'latitude', 'longitude', 'location'
]

def fake_scrape(term, location):
    """Fake generator yielding place info.

    Replace this stub with real scraping logic. It yields ``TOTAL`` results
    for the given search term and location.
    """
    for i in range(TOTAL):
        yield {
            'name': f'{term} biz {i} ({location})',
            'address': f'{i} Example St, {location}',
            'website': f'http://example{i}.com',
            'phone': f'555-010{i:02d}',
            'reviews_average': round(random.uniform(1.0, 5.0), 2),
            'query': term,
            'latitude': round(random.uniform(-90, 90), 6),
            'longitude': round(random.uniform(-180, 180), 6),
            'location': location
        }

def inject_bar(page):
    page.evaluate(
        """() => {
        if (!document.getElementById('gmaps-status')) {
          const wrap = document.createElement('div');
          wrap.id = 'gmaps-status';
          wrap.style.cssText = 'position:fixed;top:0;left:0;width:100%;z-index:9999;background:#fff;font-family:sans-serif;font-size:12px;';
          wrap.innerHTML = '<div id="gmaps-status-text" style="padding:4px 8px"></div><div style="height:3px;background:#e9ecef"><div id="gmaps-progress-bar" style="height:3px;background:#0d6efd;width:0%"></div></div>';
          document.body.prepend(wrap);
        }
      }"""
    )


def update_bar(page, text, pct):
    page.evaluate(
        """(t, p) => {
        const txt = document.getElementById('gmaps-status-text');
        if (txt) txt.textContent = t;
        const bar = document.getElementById('gmaps-progress-bar');
        if (bar) bar.style.width = p + '%';
      }""",
        text,
        pct,
    )


def main():
    os.makedirs(os.path.dirname(OUT) or '.', exist_ok=True)
    first_write = not os.path.exists(OUT)
    with open(OUT, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        if first_write:
            writer.writeheader()
        with sync_playwright() as p:
            total_locations = len(LOCATIONS)
            total_terms = len(TERMS)
            while True:
                for loc_index, location in enumerate(LOCATIONS, 1):
                    for term_index, term in enumerate(TERMS, 1):
                        print(
                            f"Processing '{term}' in '{location}' "
                            f"[{loc_index}/{total_locations} location, {term_index}/{total_terms} term]"
                        )
                        browser = p.chromium.launch(headless=False)
                        page = browser.new_page()
                        page.goto('https://www.google.com/maps')

                        page.wait_for_load_state('networkidle')
                        page.fill('input#searchboxinput', f'{term} {location}')
                        page.keyboard.press('Enter')
                        page.wait_for_load_state('networkidle')

                        inject_bar(page)
                        count = 0
                        for row in fake_scrape(term, location):
                            writer.writerow(row)
                            count += 1
                            pct = min(100, (count / TOTAL) * 100)
                            update_bar(
                                page,
                                f"{location} [{loc_index}/{total_locations}] {term} [{term_index}/{total_terms}] {count}/{TOTAL}",
                                pct,
                            )
                            if count >= TOTAL:
                                break
                        f.flush()
                        page.wait_for_timeout(1000)
                        browser.close()
                        print(
                            f"Finished '{term}' in '{location}' "
                            f"with {count} results [{loc_index}/{total_locations}, {term_index}/{total_terms}]"
                        )
                time.sleep(60)

if __name__ == '__main__':
    main()
