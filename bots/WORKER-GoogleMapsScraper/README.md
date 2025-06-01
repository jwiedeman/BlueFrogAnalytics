# Google Maps Scraper Worker

This worker scrapes business listings from Google Maps using Playwright.
Results append to a CSV file so data from multiple runs is preserved.
Each record is also stored in a local SQLite database (`<csv>.db`) for
reliability.

## Usage

Install Python 3.11+ and the dependencies:

```bash
pip install -r requirements.txt
```

Run the worker with a search query, number of results and output CSV path:

```bash
python worker.py "Coffee shops in New York" 100 output/results.csv
```

A browser will run headless and the CSV will populate while scraping. Run the
script again with the same CSV path to continue building the dataset.

## City grid scraping

`grid_worker.py` automates searches across a grid of GPS coordinates around a city. It deduplicates results and appends them to the same CSV and SQLite database used by `worker.py`.

```bash
python grid_worker.py "Portland, OR" "coffee shops" 1 0.02 50 output/portland.csv
```

The parameters are: city name, search query, number of grid steps from the center, spacing in degrees between grid points, number of results per grid cell, and output CSV path.
