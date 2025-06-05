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

Set `CASSANDRA_URL` and `CASSANDRA_KEYSPACE` to point at your cluster. By
default the worker connects to `domain_discovery` at
`192.168.1.201,192.168.1.202,192.168.1.203,192.168.1.204`.

Available test groups include:

- `ssl` – certificate details
- `whois` – WHOIS and registration data
- `dns` – DNS enumeration
- `tech` – technology fingerprinting
- `lighthouse` – Lighthouse audits
- `carbon` – carbon footprint metrics
- `analytics` – analytics tag health
- `webpagetest` – WebPageTest results
- `enrich` – metadata enrichment (built in)

Run with `--all` to execute every scan. Results are saved to Cassandra using the
columns outlined in `db_schema.md`.

This worker serves as an orchestrator. Each individual scan is a thin wrapper
around the existing bots in the `bots/` directory or third-party libraries. The
initial version only prints which scans would run, providing clear integration
points for future code.

The enrichment logic (GeoIP, SSL, homepage scraping and technology detection)
is bundled directly within this worker along with a local copy of Wappalyzer's
database. No external network requests are made when fingerprinting a site.
