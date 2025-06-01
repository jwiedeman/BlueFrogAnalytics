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

The parameters are: city name, search query, number of grid steps from the center, spacing in degrees between grid points, number of results per grid cell, and output CSV path.  Use `--no-headless` to show the browser and `--min-delay`/`--max-delay` to randomize pauses between grid locations.

### Running multiple terms

`orchestrator.py` launches several grid scrapers at once and tiles the windows so they fit on screen.  Provide a comma separated list of search terms and an output directory.

```bash
python orchestrator.py "Portland, OR" \
  --terms "Restaurants,Bars,Hotels,Retail stores,Gas stations,Pharmacies,Automotive,Banks,Healthcare,Professional services,Education,Government offices,Entertainment,Construction,Real estate" \
  --steps 1 \
  --spacing 0.0145 \
  --total 50 \
  --output-dir output/portland
```

The spacing value `0.0145` roughly equals one mile.  Increase `--steps` or the spacing to cover larger radii (for example `--steps 10 --spacing 0.0145` covers about ten miles).  Windows open in non‑headless mode so you can watch progress.
