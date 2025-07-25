# Blue Frog Analytics

Blue Frog Analytics is a collection of tools for large scale domain intelligence, auditing and documentation. The repository hosts crawling workers, a REST API server and an Astro based documentation site.

## Repository layout

- `frontend/` – Astro 5 site built with Tailwind CSS and BlueFrogAnalytics UI. Replaces the older Bootstrap-based `website/` directory.
- `server/` – Express API providing profile management, Lighthouse audits and Firebase authentication.
- `bots/` – Independent workers and bots for data gathering. Each folder includes its own README.
- `database-control/` – Docker files and configuration for running a multi node Cassandra cluster.
- `sandbox/` – Experimental scripts and prototypes used for research.

## Prerequisites

- Node.js 18+
- Docker (for optional containerised deployments)
- A Cassandra cluster (see `database-control/DB[Cfg]`)
- Firebase project credentials

## Quick start

1. Install server dependencies and create an environment file:

   ```bash
   npm install
   ```

   Create `server/.env` and populate it with your Firebase service account path
   and Cassandra connection details.

2. Start the API server from the repository root:

   ```bash
   npm start
   ```

3. Launch the frontend site in a separate shell:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Documentation site

The documentation site lives in the `frontend` directory.

```bash
cd frontend
npm install
npm run dev
```

Add your Firebase values to `.env`. For production builds copy the file to `.env.production` and then run:

```bash
npm run build
```

Static documentation content resides in `src/content/docs`.

The full list of site pages is maintained in `SITE_PAGES_OVERVIEW.md`
(duplicated as `PAGE_STRUCTURE.md`). Keep this file updated whenever new pages
are added under `frontend/src/pages`.

## API server

The API server under `server/apiServer.js` exposes endpoints for profile management and website audits. It requires a Firebase service account and Cassandra connection details. If `FIREBASE_SERVICE_ACCOUNT` is not set, the server falls back to `server/serviceAccount.json`.

Run locally:

```bash
npm install
# installs a bundled version of Chrome for Puppeteer
npm start
```
If you see a "Could not find Chrome" error, run `npx puppeteer browsers install chrome`
or set `PUPPETEER_EXECUTABLE_PATH` to your Chrome binary.

Or build the Docker image:

```bash
docker build -t profile-service .
docker run -p 6001:6001 \
  -v /path/to/serviceAccount.json:/app/serviceAccount.json:ro \
  -e FIREBASE_SERVICE_ACCOUNT=/app/serviceAccount.json \
  -e CASSANDRA_CONTACT_POINTS=127.0.0.1 \
  -e CASSANDRA_LOCAL_DATA_CENTER=datacenter1 \
  -e CASSANDRA_KEYSPACE=profiles \
  profile-service
```

## Bots

The `bots` directory contains several workers written in Go, Rust, Python and Node. See each subfolder's README for build instructions and usage. A helper script `build_all_docker.sh` can build every bot image at once. Items prefixed with `BACKEND-` are utility scripts used by the API or the website's free tools rather than autonomous workers. A consolidated worker named `WORKER-Medusa` orchestrates recon modules, DNS/WHOIS enumeration, WebPageTest metrics, screenshot and heatmap generation, Google Maps scraping and per-page metrics capture.

## Cassandra cluster

For a resilient Cassandra setup review `database-control/DB[Cfg]`. Dockerfiles and configuration templates are provided for seed and non-seed nodes.
The helper `database-control/create_blue_frog_keyspace.py` bootstraps a fresh
`blue_frog` keyspace by copying the layout from `domain_discovery` but converts
collection columns to plain `TEXT`.
`database-control/migrate_domain_discovery_to_blue_frog.py` then copies rows
from every `domain_discovery` table into the new keyspace, JSON encoding any
lists or maps so Medusa can continue writing without schema conflicts.

## Sandbox

The `sandbox` folder houses various experimental projects and is not intended for production use.

## Running tests

Unit tests for the Medusa worker live under `bots/WORKER-Medusa/tests`. Run them
from the repository root with:

```bash
pytest -q
```

## Continuous deployment

A GitHub Actions workflow under `.github/workflows/astro.yml` builds the documentation site and deploys it to GitHub Pages on each push to `main`.

---

For further details on any component please consult the README within the respective subdirectory.
