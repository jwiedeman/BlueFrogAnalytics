# Google Maps Scraper Worker

This worker scrapes business listings from Google Maps using Playwright.
Results are written to a CSV file as each listing is processed.

## Usage

Install Python 3.11+ and the dependencies:

```bash
pip install -r requirements.txt
```

Run the worker with a search query, number of results and output CSV path:

```bash
python worker.py "Coffee shops in New York" 100 output/results.csv
```

A browser will run headless and the CSV will populate while scraping.
