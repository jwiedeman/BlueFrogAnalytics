# Medusa Scan Engine

Medusa combines the capabilities of the existing workers into a single command line
utility. It can run a **full crawl** that covers all columns in `domains_processed`
or execute a **subset** of scans such as only SSL or DNS checks. The Node-based
AutoLighthouse worker has been copied into this folder so the Lighthouse tests run
without relying on a sibling directory.

The tool references `db_schema.md` to keep the output aligned with the Cassandra
schema. Each scan writes to the appropriate table using the column groups defined
in that document.

## Installation

Create a Python 3.11 (or earlier) virtual environment and install the required packages. The Cassandra driver used by Medusa does not support Python 3.12+:

```bash
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m playwright install
```

## Usage

```bash
python medusa.py --domain example.com --all
python medusa.py --domain example.com --tests ssl,dns
```

Set the following environment variables to connect to Cassandra:

- `MEDUSA_CASSANDRA_HOSTS` – comma separated list of nodes
- `MEDUSA_CASSANDRA_PORT` – port number (defaults to `9042`)
- `MEDUSA_CASSANDRA_KEYSPACE` – keyspace name (defaults to `domain_discovery`)
- `MEDUSA_CASSANDRA_DC` – data center name (defaults to `datacenter1`)

The worker falls back to `CASSANDRA_URL` and `CASSANDRA_KEYSPACE` for backward
compatibility and uses `192.168.1.201,192.168.1.202,192.168.1.203,192.168.1.204`
when no variables are provided.

Available test groups include:

- `ssl` – certificate details
- `whois` – WHOIS and registration data
- `dns` – DNS enumeration
- `tech` – technology fingerprinting
- `lighthouse` – Lighthouse audits (bundled AutoLighthouse worker)
- `carbon` – carbon footprint metrics
- `analytics` – analytics tag health
- `webpagetest` – WebPageTest results
- `enrich` – metadata enrichment (built in)
- `recon` – passive open ports and header checks
- `page` – crawl the site and record per-page metrics
- `screenshot` – capture full page screenshots
- `heatmap` – generate contrast heatmaps
- `maps` – Google Maps business scraping

Run with `--all` to execute every scan. Results are saved to Cassandra using the
columns outlined in `db_schema.md`.

The `scans/` directory houses the reconnaissance modules imported from
`BOT-Recon_[Py]` along with the additional modular tests from
`BOT-SensorFusion_[Py]`. The experimental fingerprinting engine and its related
tests remain in the Sensor Fusion bot. Medusa focuses on the common modules that
write to Cassandra.

This worker serves as an orchestrator. Each individual scan is a thin wrapper
around the existing bots in the `bots/` directory or third-party libraries.
Earlier versions only printed which scans would run. The worker now executes the
Lighthouse, Carbon and DNS modules directly (using the bundled Node scripts and
Python helpers) so results are stored in Cassandra without manual steps.

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
- `phone_numbers`
- `sms_numbers`
- `addresses`
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
- `favicon_url`
- `robots_txt_exists`
- `robots_txt_content`
- `canonical_url`
- `h1_count`
- `h2_count`
- `h3_count`
- `schema_markup_detected`
- `schema_types`
- `security_headers_score`
- `security_headers_detected`
- `hsts_enabled`
- `cookie_compliance`
- `third_party_scripts`
- `color_contrast_issues`
- `aria_landmark_count`
- `form_accessibility_issues`
- `social_media_profiles`
- `rss_feed_detected`
- `newsletter_signup_detected`
- `cdn_detected`
- `http_version`
- `compression_enabled`
- `cache_control_headers`
- `page_weight_bytes`
- `main_language`
- `content_keywords`
- `ecommerce_platforms`
- `sitemap_page_count`
- `last_enriched`
Additional enrichment fields (`ssl_org`, `x_powered_by`, `wordpress_asset_version`, `wpjson_size_bytes`, `wpjson_contains_cart`, `more_than_5_internal_links`, `ecommerce_platforms`, `postal_code`, `phone_numbers`, `sms_numbers`, `addresses`) are now written to Cassandra along with the standard columns.
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

## TODO / Complete

### Completed

- Expanded enrichment columns: `favicon_url`, `robots_txt_exists`, `robots_txt_content`, `canonical_url`, `h1_count`, `h2_count`, `h3_count`, `schema_markup_detected`, `schema_types`, `security_headers_score`, `security_headers_detected`, `hsts_enabled`, `cookie_compliance`, `third_party_scripts`, `color_contrast_issues`, `aria_landmark_count`, `form_accessibility_issues`, `social_media_profiles`, `rss_feed_detected`, `newsletter_signup_detected`, `cdn_detected`, `http_version`, `compression_enabled`, `cache_control_headers`, `page_weight_bytes`, `main_language`, `content_keywords`.
- Added initial recon columns: `open_ports`, `allowed_http_methods`, `waf_name`, `directory_scan`, `certificate_info`.
- Integrated recon scan module to populate these fields automatically.
- Added recon metrics: `meta_tag_count`, `sitemap_robots_conflict`, `insecure_cookie_count`, `external_resource_count`, `passive_subdomain_count`.
- Added page metrics: `status_code`, `redirect_chain`, `page_load_time_ms`, `broken_links_count`, `internal_links_count`, `external_links_count`, `page_images_count`, `missing_alt_text_images_count`, `video_embeds_count`, `iframe_embeds_count`, `duplicate_meta_titles`, `duplicate_meta_descriptions`.
- Implemented DNS enumeration with DMARC and SPF support and integrated WHOIS lookups.
- Added WebPageTest metrics collection (load time, speed index, TTFB).
- Added full page screenshot capture and contrast heatmap generation.
- Added Google Maps scraping storing results in the `businesses` table.

- Crawl each discovered page after verifying the domain is reachable.
- Store per-page metrics in `domain_page_metrics` so data can be queried by URL.
- Domain level tests now use the canonical domain discovered during the initial
  reachability check.

### Planned
No open items.
