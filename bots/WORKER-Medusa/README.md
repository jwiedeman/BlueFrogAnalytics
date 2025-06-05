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
- `lighthouse` – Lighthouse audits (via AutoLighthouse worker)
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
points for future code. The Lighthouse scan delegates to the Node-based
AutoLighthouse worker which writes metrics back to Cassandra.

The enrichment logic (GeoIP, SSL, homepage scraping and technology detection)
is bundled directly within this worker along with a local copy of Wappalyzer's
database. No external network requests are made when fingerprinting a site.

## Columns Updated

Medusa writes results to several Cassandra tables. The lists below map each
scan group to the exact columns populated. See `db_schema.md` for the full
type information.

### `domains_processed`

- `status`
- `updated`
- `as_name`
- `as_number`
- `city`
- `continent`
- `continent_code`
- `country`
- `country_code`
- `isp`
- `languages`
- `lat`
- `lon`
- `org`
- `phone`
- `region`
- `region_name`
- `registered`
- `registrar`
- `ssl_issuer`
- `tech_detect`
- `time_zone`
- `title`
- `description`
- `linkedin_url`
- `has_about_page`
- `has_services_page`
- `has_cart_or_product`
- `contains_gtm_or_ga`
- `wordpress_version`
- `server_type`
- `server_version`
- `emails`
- `sitemap_page_count`
- `last_enriched`
- all Lighthouse metric columns such as `desktop_performance_score`,
  `mobile_performance_score`, `desktop_first_contentful_paint`,
  `mobile_first_contentful_paint`, `lighthouse_version`,
  `lighthouse_fetch_time`, `desktop_performance_suggestions`,
  `mobile_performance_suggestions`, etc.

### `analytics_tag_health`

- `domain`, `scan_date`, `working_variants`, `scanned_urls`, `found_analytics`,
  `page_results`, `variant_results`, `compliance_status`

### `carbon_audits`

- `domain`, `url`, `scan_date`, `bytes`, `co2`

### `dns_records`

- `domain`, `record_type`, `record_value`, `scan_date`

### `misc_tool_results`

- `domain`, `url`, `scan_date`, `tool_name`, `data`
