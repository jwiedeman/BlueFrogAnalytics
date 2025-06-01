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

## City grid scraping

`grid_worker.py` automates searches across a grid of GPS coordinates around a city. It deduplicates results as they are written to the CSV.

```bash
python grid_worker.py "Portland, OR" "coffee shops" 1 0.02 50 output/portland.csv
```

The parameters are: city name, search query, number of grid steps from the center, spacing in degrees between grid points, number of results per grid cell, and output CSV path.
