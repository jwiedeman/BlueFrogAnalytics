# Medusa Scan Engine

Medusa combines the capabilities of the existing workers into a single command line
utility. It can run a **full crawl** that covers all columns in `domains_processed`
or execute a **subset** of scans such as only SSL or DNS checks.

The tool references `db_schema.md` to keep the output aligned with the Cassandra
schema. Each scan writes to the appropriate table using the column groups defined
in that document.

## Usage

```bash
python medusa.py --domain example.com --all
python medusa.py --domain example.com --tests ssl,dns
```

Available test groups include:

- `ssl` – certificate details
- `whois` – WHOIS and registration data
- `dns` – DNS enumeration
- `tech` – technology fingerprinting
- `lighthouse` – Lighthouse audits
- `carbon` – carbon footprint metrics
- `analytics` – analytics tag health
- `webpagetest` – WebPageTest results
- `enrich` – metadata enrichment from `WORKER-Enrich_processed_domains`

Run with `--all` to execute every scan. Results are saved to Cassandra using the
columns outlined in `db_schema.md`.

This worker serves as an orchestrator. Each individual scan is a thin wrapper
around the existing bots in the `bots/` directory or third-party libraries. The
initial version only prints which scans would run, providing clear integration
points for future code.
