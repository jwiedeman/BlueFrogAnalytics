import os
import csv
import random
import sys
import time
from typing import Generator, Dict

import requests

# Google Maps Places API key
API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY')

# Usage: worker.py "term1;term2" total output_path

TERMS = [t.strip() for t in (sys.argv[1] if len(sys.argv) > 1 else '').split(';') if t.strip()]
TOTAL = int(sys.argv[2]) if len(sys.argv) > 2 else 10
OUT = sys.argv[3] if len(sys.argv) > 3 else 'output/maps.csv'
LOOPS = int(os.environ.get('MAPS_LOOPS', '1'))
# Random delay between queries to mimic human behaviour
MIN_DELAY = float(os.environ.get('MAPS_MIN_DELAY', '5'))
MAX_DELAY = float(os.environ.get('MAPS_MAX_DELAY', '15'))
# Randomise the order of location/term pairs by default
SHUFFLE = os.environ.get('MAPS_SHUFFLE', '1') != '0'

LOCATIONS = [l.strip() for l in os.environ.get('MAPS_LOCATIONS', 'US').split(';') if l.strip()]

FIELDNAMES = [
    'name', 'address', 'website', 'phone', 'reviews_average',
    'query', 'latitude', 'longitude', 'location'
]


def api_scrape(term: str, location: str) -> Generator[Dict[str, str], None, None]:
    """Yield business info using the Google Places API."""
    if not API_KEY:
        raise RuntimeError('GOOGLE_MAPS_API_KEY not set')

    base_url = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
    params = {'query': f'{term} {location}', 'key': API_KEY}
    next_token = None
    count = 0
    while True:
        if next_token:
            params = {'pagetoken': next_token, 'key': API_KEY}
            time.sleep(2)
        resp = requests.get(base_url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        for r in data.get('results', []):
            details = {}
            place_id = r.get('place_id')
            if place_id:
                det = requests.get(
                    'https://maps.googleapis.com/maps/api/place/details/json',
                    params={
                        'place_id': place_id,
                        'fields': 'formatted_phone_number,website',
                        'key': API_KEY,
                    },
                    timeout=10,
                )
                if det.ok:
                    info = det.json().get('result', {})
                    details = {
                        'phone': info.get('formatted_phone_number', ''),
                        'website': info.get('website', ''),
                    }

            yield {
                'name': r.get('name', ''),
                'address': r.get('formatted_address', ''),
                'website': details.get('website', ''),
                'phone': details.get('phone', ''),
                'reviews_average': r.get('rating'),
                'query': term,
                'latitude': r.get('geometry', {}).get('location', {}).get('lat'),
                'longitude': r.get('geometry', {}).get('location', {}).get('lng'),
                'location': location,
            }
            count += 1
            if count >= TOTAL:
                return
        next_token = data.get('next_page_token')
        if not next_token:
            break

SEARCH_TIMEOUT = int(os.environ.get("MAPS_SEARCH_TIMEOUT", "300"))
# If no new results appear for this many seconds, skip to the next term
STALL_TIMEOUT = int(os.environ.get("MAPS_STALL_TIMEOUT", "20"))


def main():
    os.makedirs(os.path.dirname(OUT) or '.', exist_ok=True)
    first_write = not os.path.exists(OUT)
    with open(OUT, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        if first_write:
            writer.writeheader()
        total_locations = len(LOCATIONS)
        total_terms = len(TERMS)
        pairs = [(loc, term) for loc in LOCATIONS for term in TERMS]
        if SHUFFLE:
            random.shuffle(pairs)
        pair_count = len(pairs)
        loop = 0
        pair_index = 0

        while LOOPS <= 0 or loop < LOOPS:
            location, term = pairs[pair_index]
            loc_index = pair_index // total_terms + 1
            term_index = pair_index % total_terms + 1
            print(
                f"Processing '{term}' in '{location}' "
                f"[{loc_index}/{total_locations} location, {term_index}/{total_terms} term, loop {loop}/{LOOPS if LOOPS>0 else '?'}]"
            )

            start = time.time()
            count = 0
            for row in api_scrape(term, location):
                writer.writerow(row)
                count += 1
                print(
                    f"{location} [{loc_index}/{total_locations}] {term} [{term_index}/{total_terms}] {count}/{TOTAL} (loop {loop}/{LOOPS if LOOPS>0 else '?'} )",
                    flush=True,
                )
                if count >= TOTAL or time.time() - start > SEARCH_TIMEOUT:
                    break
            f.flush()
            time.sleep(random.uniform(MIN_DELAY, MAX_DELAY))
            print(
                f"Finished '{term}' in '{location}' "
                f"with {count} results [{loc_index}/{total_locations}, {term_index}/{total_terms}, loop {loop}/{LOOPS if LOOPS>0 else '?'}]"
            )
            pair_index += 1
            if pair_index >= pair_count:
                pair_index = 0
                if SHUFFLE:
                    random.shuffle(pairs)
                loop += 1
                if LOOPS > 0 and loop >= LOOPS:
                    break
                time.sleep(60)

if __name__ == '__main__':
    main()

