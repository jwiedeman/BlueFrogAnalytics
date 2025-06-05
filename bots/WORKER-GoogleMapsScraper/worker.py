import os
import csv
import random
import sys
import time

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

def main():
    os.makedirs(os.path.dirname(OUT) or '.', exist_ok=True)
    first_write = not os.path.exists(OUT)
    with open(OUT, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        if first_write:
            writer.writeheader()
        while True:
            for location in LOCATIONS:
                for term in TERMS:
                    for row in fake_scrape(term, location):
                        writer.writerow(row)
                    f.flush()
            time.sleep(60)

if __name__ == '__main__':
    main()
