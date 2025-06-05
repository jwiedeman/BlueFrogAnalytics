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
LOOPS = int(os.environ.get('MAPS_LOOPS', '1'))

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

SEARCH_TIMEOUT = int(os.environ.get("MAPS_SEARCH_TIMEOUT", "300"))


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
            loop = 0
            while LOOPS <= 0 or loop < LOOPS:
                loop += 1
                for loc_index, location in enumerate(LOCATIONS, 1):
                    for term_index, term in enumerate(TERMS, 1):
                        print(
                            f"Processing '{term}' in '{location}' "
                            f"[{loc_index}/{total_locations} location, {term_index}/{total_terms} term, loop {loop}/{LOOPS if LOOPS>0 else '?'}]"
                        )
                        browser = p.chromium.launch(headless=False)
                        page = browser.new_page()
                        page.goto('https://www.google.com/maps')

                        page.wait_for_load_state('networkidle')
                        page.fill('input#searchboxinput', f'{term} {location}')
                        page.keyboard.press('Enter')
                        page.wait_for_load_state('networkidle')

                        start = time.time()
                        count = 0
                        for row in fake_scrape(term, location):
                            writer.writerow(row)
                            count += 1
                            pct = min(100, (count / TOTAL) * 100)
                            print(
                                f"{location} [{loc_index}/{total_locations}] {term} [{term_index}/{total_terms}] {count}/{TOTAL} (loop {loop}/{LOOPS if LOOPS>0 else '?'} )",
                                flush=True,
                            )
                            if count >= TOTAL or time.time() - start > SEARCH_TIMEOUT:
                                break
                        f.flush()
                        page.wait_for_timeout(1000)
                        browser.close()
                        print(
                            f"Finished '{term}' in '{location}' "
                            f"with {count} results [{loc_index}/{total_locations}, {term_index}/{total_terms}, loop {loop}/{LOOPS if LOOPS>0 else '?'}]"
                        )
                time.sleep(60)

if __name__ == '__main__':
    main()

