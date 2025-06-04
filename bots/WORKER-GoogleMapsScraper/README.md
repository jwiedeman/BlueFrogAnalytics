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

## City grid scraping

`grid_worker.py` automates searches across a grid of GPS coordinates around a
city. It deduplicates results using business name and address and appends them
to the configured database or CSV file.

```bash
python grid_worker.py "Portland, OR" "coffee shops" 1 0.02 50
```

The parameters are: city name, search query, number of grid steps from the center, spacing in degrees between grid points, number of results per grid cell, and an optional database DSN. Use `--headless` to hide the browser and `--min-delay`/`--max-delay` to randomize pauses between grid locations.

### Running multiple terms

`orchestrator.py` launches several grid scrapers at once and tiles the windows
to create a control room style view. Provide a comma separated list of search
terms.

```bash
python orchestrator.py "Portland, OR" \
  --terms "Restaurants,Bars,Hotels,Retail stores,Gas stations,Pharmacies,Automotive,Banks,Healthcare,Professional services,Education,Government offices,Entertainment,Construction,Real estate" \
  --steps 1 \
  --spacing 0.0145 \
  --total 50 \
  --concurrency 4
```

The spacing value `0.0145` roughly equals one mile.  Increase `--steps` or the spacing to cover larger radii (for example `--steps 10 --spacing 0.0145` covers about ten miles).  Windows open in non‑headless mode so you can watch progress.

Pass `--concurrency` to limit how many browser instances run at once. The orchestrator automatically tiles visible windows in a grid sized to this concurrency value.

## Spiral pan mode

`spiral_worker.py` moves the map around using the arrow keys while the "Update results when map moves" setting is enabled. It collects business details from the sidebar after each pan and expands outward in a spiral pattern.

```bash
# DSN may be omitted if POSTGRES_DSN is set
python spiral_worker.py "coffee shops in Portland, OR" 5
```

The first argument is the search query. Include the location in this string or manually pan the map before starting. The second argument controls how many spiral rings to traverse.

Additional options:

- `dsn` – Postgres connection string (defaults to `$POSTGRES_DSN`)
- `--headless` – run the browser without showing a window
- `--store` – override storage backend for this run

Example with an explicit DSN and headless mode:

```bash
python spiral_worker.py "pizza restaurants in Seattle" 10 "dbname=maps user=postgres" --headless
```

### Local Postgres setup

`spiral_worker.py` and the other scripts expect a running Postgres instance.
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
