# Google Maps Scraper Worker

This worker scrapes business listings from Google Maps using Playwright.
Results are written to a Postgres database so data from every run
is stored together. Each record notes the search term and the GPS
coordinates where it was collected.

## Usage

Install Python 3.11+ and the dependencies:

```bash
pip install -r requirements.txt
```

Run the worker with a search query, number of results and a Postgres DSN:

```bash
python worker.py "Coffee shops in New York" 100 "dbname=maps user=postgres host=localhost password=postgres"
```

Browsers show a window by default. Pass `--headless` to hide it.

## City grid scraping

`grid_worker.py` automates searches across a grid of GPS coordinates around a
city. It deduplicates results using business name and address and appends them
to the same Postgres database used by `worker.py`.

```bash
python grid_worker.py "Portland, OR" "coffee shops" 1 0.02 50 "dbname=maps user=postgres host=localhost password=postgres"
```

The parameters are: city name, search query, number of grid steps from the center, spacing in degrees between grid points, number of results per grid cell, and database DSN. Use `--headless` to hide the browser and `--min-delay`/`--max-delay` to randomize pauses between grid locations.

### Running multiple terms

`orchestrator.py` launches several grid scrapers at once and tiles the windows
to create a control room style view. Provide a comma separated list of search
terms and the database DSN.

```bash
python orchestrator.py "Portland, OR" \
  --terms "Restaurants,Bars,Hotels,Retail stores,Gas stations,Pharmacies,Automotive,Banks,Healthcare,Professional services,Education,Government offices,Entertainment,Construction,Real estate" \
  --steps 1 \
  --spacing 0.0145 \
  --total 50 \
  --dsn "dbname=maps user=postgres host=localhost password=postgres" \
  --concurrency 4
```

The spacing value `0.0145` roughly equals one mile.  Increase `--steps` or the spacing to cover larger radii (for example `--steps 10 --spacing 0.0145` covers about ten miles).  Windows open in non‑headless mode so you can watch progress.

Pass `--concurrency` to limit how many browser instances run at once. The orchestrator automatically tiles visible windows in a grid sized to this concurrency value.

## Spiral pan mode

`spiral_worker.py` moves the map around using the arrow keys while the "Update results when map moves" setting is enabled. It collects business details from the sidebar after each pan and expands outward in a spiral pattern.

```bash
# DSN may be omitted if POSTGRES_DSN is set
python spiral_worker.py "coffee shops" 5 "dbname=maps user=postgres host=localhost password=postgres"

```

The second argument controls how many spiral rings to traverse. Use `--headless` to hide the browser window.

### Local Postgres setup

`spiral_worker.py` and the other scripts expect a running Postgres instance.
To run one without Docker execute `start_postgres.sh` in this folder. The script
initialises a database under `pgdata/` on first run and starts the server on
port `5432`.

```bash
./start_postgres.sh
```

Once the server is running the default DSN `dbname=maps user=postgres host=localhost password=postgres`
will connect successfully. You can also set a custom connection string via the
`POSTGRES_DSN` environment variable when invoking the workers.

### Exporting to Excel

Use `export_to_excel.py` to convert the Postgres database to an Excel file:

```bash
python export_to_excel.py "dbname=maps user=postgres host=localhost password=postgres" results.xlsx
```

## Docker Swarm

This image can also run as a service in Docker Swarm after being built and pushed to your registry.

```bash
docker service create --name <service-name> --env-file .env <image>:latest
```

Alternatively include the service in a stack file and deploy with `docker stack deploy`.
