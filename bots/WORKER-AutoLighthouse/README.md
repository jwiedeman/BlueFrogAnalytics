# Lighthouse Site Auditor

A CLI tool to run Lighthouse audits on all pages of a website and update the results in Apache Cassandra.

## Usage

Run locally from source:

  # Install dependencies
  npm install

  # Run the auditor in one command
  node index.js run --url https://example.com --concurrency 5

You can also run without installing locally using npx:

  npx lighthouse-site-auditor run --url https://example.com --concurrency 5

Or install globally:

  npm install -g .
  lighthouse-site-auditor run --url https://example.com --concurrency 5

Or build and run in Docker with automatic output mounting:

  # Use the provided script to build the image and mount the output directory
  bash run-docker.sh run --url https://example.com --concurrency 5

## Cassandra Integration


This worker can pull domains directly from Cassandra and update their Lighthouse metrics.
Use the `db` command to continuously audit domains stored in Cassandra:

```
node index.js db
```

The worker reuses a single headless Chrome instance and opens a new tab for each
domain. This avoids the overhead of launching Chrome for every audit when
running in bulk.

Each domain is tested by visiting its homepage only. If you want to audit all
pages of a single site, use the `run` command instead.

You can run multiple workers in parallel to speed up auditing. Each worker runs
in its own process to avoid Lighthouse timing conflicts. For example, to run 10
workers with a 10 second delay between checks:

```
node index.js db --workers 10 --interval 10
```

Database connection settings are defined in `cassandra.js`.

Only domains with `status = true` and missing Lighthouse data are pulled from
Cassandra when running the `db` command.

