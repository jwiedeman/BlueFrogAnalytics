# Google Maps Scraper Worker

This worker scrapes business listings from Google Maps using Playwright.
Results can be written to Postgres, Cassandra, a local SQLite file or a
CSV depending on the configured storage backend. Each record notes the search term and the GPS
coordinates where it was collected.

## Usage

Install Python 3.11+ and the dependencies:

```bash
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and modify values as needed for your environment.

The scraper defaults to a local SQLite database. Choose between `postgres`, `cassandra`, `sqlite` or `csv`
using the `MAPS_STORAGE` environment variable or the `--store` option. When using Postgres
set the connection string with the `POSTGRES_DSN` environment variable.
The Cassandra driver is optional and only needed when the storage mode is set to `cassandra`.

## City grid scraping

`grid_worker.py` automates searches across a grid of GPS coordinates around a
city. Coordinates are retrieved directly from Google Maps so no external
geocoding service is required. The worker deduplicates results using business
name and address and appends them to the configured database or CSV file.

```bash
python grid_worker.py "Portland, OR" 1 0.02 50 --query "coffee shops"
```

The city name is automatically prepended to the query so the example above
searches for `"Portland, OR coffee shops"`.

The parameters are: city name, number of grid steps from the center, spacing in degrees between grid points, number of results per grid cell, and an optional database DSN. Provide a search term with `--query`. Use `--headless` to hide the browser and `--min-delay`/`--max-delay` to randomize pauses between grid locations.

To scrape multiple terms sequentially with a single worker use the `--terms` option:

```bash
python grid_worker.py "Portland, OR" 1 0.02 50 --terms "restaurants,bars,cafes"
```

Each term is searched alongside the city, e.g. `"Portland, OR restaurants"`.

### Running multiple terms

`orchestrator.py` coordinates multiple grid workers and tiles the windows so you
can monitor progress. Provide a comma separated list of search terms. Multiple
cities can be scraped by supplying `--cities` with a comma separated list in
addition to the primary positional city argument. The city name is automatically
appended to each search query.

```bash
python orchestrator.py "Portland, OR" \
  --cities "Seattle, WA,Boise, ID" \
  --terms "Restaurants,Bars,Hotels,Retail stores,Gas stations,Pharmacies,Automotive,Banks,Healthcare,Professional services,Education,Government offices,Entertainment,Construction,Real estate" \
  --steps 5 \
  --concurrency 4 \
  --launch-stagger 30
```

Windows open in non‑headless mode so you can watch progress. Pass `--concurrency`
to limit how many browser instances run at once. Use `--launch-stagger` to delay
the start of each scraper window. The orchestrator now cycles continuously
through the provided cities and search terms. Each worker processes every term
for a city, adds that city back to the queue, and moves on. This creates a
persistent harvesting loop rather than exiting after one pass.

## Manual monitor mode

`monitor_worker.py` lets you pan the map yourself while the script records
any new business listings that appear in the sidebar. Each unique listing is
stored in the configured database and a brief toast notification is shown in the
browser when it's saved.

```bash
python monitor_worker.py "coffee shops near me"
```

Use `--interval` to change how often the sidebar is scanned and `--headless` to
run the browser without a visible window. The `--store` option selects the
storage backend just like the other workers.

### Local Postgres setup

The workers expect a running Postgres instance.
Ensure the PostgreSQL command line tools (`initdb`, `pg_ctl` and `createdb`)
are installed and available on your `PATH`. On macOS install them with
Homebrew (`brew install postgresql`) and on Debian/Ubuntu use
`sudo apt-get install postgresql`. If the commands aren't on your `PATH` after
installing with Homebrew, add `/usr/local/opt/postgresql/bin` (or
`/opt/homebrew/opt/postgresql/bin` on Apple&nbsp;Silicon) to the `PATH`.

Run `start_postgres.sh` in this folder to initialise and launch the database.
The script automatically checks the common Homebrew locations above when
locating the Postgres tools. It creates a data directory under `pgdata/` on the
first run and starts the
server on port `5432` (or `$PGPORT` if set).

```bash
./start_postgres.sh
```

Once the server is running the default DSN `dbname=maps user=postgres host=localhost password=postgres`
will connect successfully. You can also set a custom connection string via the
`POSTGRES_DSN` environment variable when invoking the workers.

### Exporting to Excel

`export_to_excel.py` can convert a Postgres database to an Excel file:

```bash
python export_to_excel.py "dbname=maps user=postgres host=localhost password=postgres" results.xlsx
```

## Docker Swarm

This image can also run as a service in Docker Swarm after being built and pushed to your registry.

```bash
docker service create --name <service-name> --env-file .env <image>:latest
```

Alternatively include the service in a stack file and deploy with `docker stack deploy`.
