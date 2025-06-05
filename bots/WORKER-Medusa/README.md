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

The `tests/` directory houses the reconnaissance modules imported from
`BOT-Recon_[Py]` along with the additional modular tests from
`BOT-SensorFusion_[Py]`. The experimental fingerprinting engine and its related
tests remain in the Sensor Fusion bot. Medusa focuses on the common modules that
write to Cassandra.

This worker serves as an orchestrator. Each individual scan is a thin wrapper
around the existing bots in the `bots/` directory or third-party libraries. The
initial version only prints which scans would run, providing clear integration
points for future code.

The enrichment logic (GeoIP, SSL, homepage scraping and technology detection)
is bundled directly within this worker along with a local copy of Wappalyzer's
database. No external network requests are made when fingerprinting a site.

## Columns Updated

Medusa writes results to several Cassandra tables. Key columns include:

- **domains_processed** – status, enrichment details (AS name/number, location
  fields, ISP/organization, languages, coordinates), SSL issuer, detected
  technologies, server type/version, emails, sitemap page count, site
  classification fields and timestamps.
- **analytics_tag_health** – working variants, scanned URLs, found analytics,
  page and variant results, and compliance status.
- **carbon_audits** – per URL byte counts and estimated CO₂ emissions.
- **dns_records** – enumerated DNS records (A, AAAA, MX, NS, TXT, etc.).
- **misc_tool_results** – arbitrary results from other integrated tools.
