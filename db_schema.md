# Database Schema

This document outlines the primary data stores used across the Blue Frog Analytics project. Bots and services update these tables regularly. Schema changes should be recorded here so all processes remain in sync.

## Cassandra: `domain_discovery` keyspace

### `domains`
Domain queue used by the Hunter crawler to track discovered sites.

- `domain` text PRIMARY KEY
- `status` int *(0 new, 1 processed, 2 in progress, 3 unreachable)*
- `created_at` timestamp
- `last_attempted` timestamp
- `variation_success_json` text

### `domain_variations`
Stores the result of each HTTP variation attempted for a domain.

- `domain` text
- `variation` text
- `success` boolean
- `status_code` int
- `final_url` text
- `redirect_count` int
- `attempted_at` timestamp
- PRIMARY KEY (`domain`, `variation`, `attempted_at`)


### `certstream_domains`
Temporary table populated from certificate transparency logs before domains are parsed.

- `domain` text PRIMARY KEY

### `domains_processed`
Stores the canonical domain record with enrichment, classification and
Lighthouse performance fields.

Core identifiers:
- `domain` text
- `tld` text

Geo and network data:
- `registered` timestamp
- `registrar` text
- `updated` timestamp
- `status` text
- `as_name` text
- `as_number` int
- `isp` text
- `org` text
- `city` text
- `region` text
- `region_name` text
- `country` text
- `country_code` text
- `continent` text
- `continent_code` text
- `lat` float
- `lon` float
- `languages` list<text>
- `phone` text
- `time_zone` text

SSL and technology:
- `ssl_issuer` text
- `tech_detect` list<text>

Categorisation and content flags:
- `site_type` text
- `site_category` text
- `site_type_tags` list<text>
- `title` text
- `description` text
- `linkedin_url` text
- `has_about_page` boolean
- `has_services_page` boolean
- `has_cart_or_product` boolean
- `contains_gtm_or_ga` boolean
- `wordpress_version` text
- `server_type` text
- `server_version` text
- `emails` list<text>
- `sitemap_page_count` int

Lighthouse metrics:
- `desktop_accessibility_score` int
- `mobile_accessibility_score` int
- `desktop_best_practices_score` int
- `mobile_best_practices_score` int
- `desktop_performance_score` int
- `mobile_performance_score` int
- `desktop_seo_score` int
- `mobile_seo_score` int
- `desktop_first_contentful_paint` float
- `mobile_first_contentful_paint` float
- `desktop_largest_contentful_paint` float
- `mobile_largest_contentful_paint` float
- `desktop_interactive` float
- `mobile_interactive` float
- `desktop_speed_index` float
- `mobile_speed_index` float
- `desktop_total_blocking_time` float
- `mobile_total_blocking_time` float
- `desktop_cumulative_layout_shift` float
- `mobile_cumulative_layout_shift` float
- `desktop_timing_total` float
- `mobile_timing_total` float
- `lighthouse_version` text
- `lighthouse_fetch_time` timestamp
- `lighthouse_url` text
- `desktop_performance_suggestions` text
- `mobile_performance_suggestions` text
- `desktop_accessibility_suggestions` text
- `mobile_accessibility_suggestions` text
- `desktop_seo_suggestions` text
- `mobile_seo_suggestions` text

User tracking:
- `user_managed` boolean
- `refresh_hours` int
- `last_enriched` timestamp

Subdomains:
- `raw_subdomains` set<text>

### `domain_page_metrics`
Planned table for storing per-URL Lighthouse metrics. Current workers
write these values directly to `domains_processed`.

- `domain` text
- `url` text
- `scan_date` timestamp
- `desktop_accessibility_score` int
- `mobile_accessibility_score` int
- `desktop_best_practices_score` int
- `mobile_best_practices_score` int
- `desktop_performance_score` int
- `mobile_performance_score` int
- `desktop_seo_score` int
- `mobile_seo_score` int
- `desktop_first_contentful_paint` float
- `mobile_first_contentful_paint` float
- `desktop_largest_contentful_paint` float
- `mobile_largest_contentful_paint` float
- `desktop_interactive` float
- `mobile_interactive` float
- `desktop_speed_index` float
- `mobile_speed_index` float
- `desktop_total_blocking_time` float
- `mobile_total_blocking_time` float
- `desktop_cumulative_layout_shift` float
- `mobile_cumulative_layout_shift` float
- `desktop_timing_total` float
- `mobile_timing_total` float
- `lighthouse_version` text
- `lighthouse_fetch_time` timestamp
- `lighthouse_url` text
- `desktop_performance_suggestions` text
- `mobile_performance_suggestions` text
- `desktop_accessibility_suggestions` text
- `mobile_accessibility_suggestions` text
- `desktop_seo_suggestions` text
- `mobile_seo_suggestions` text

### `analytics_tag_health`
Detailed analytics and tag compliance results.

- `domain` text
- `scan_date` timestamp
- `working_variants` list<text>
- `scanned_urls` list<text>
- `found_analytics` map<text, text>
- `page_results` map<text, text>
- `variant_results` map<text, text>
- `compliance_status` text

### `carbon_audits`
Estimated carbon footprint of individual URLs.

- `domain` text
- `url` text
- `scan_date` timestamp
- `bytes` int
- `co2` float

### `misc_tool_results`
Flexible storage for results of additional tools (image conversion, heatmaps, etc.).

- `domain` text
- `url` text
- `scan_date` timestamp
- `tool_name` text
- `data` map<text, text>
### `businesses`
Google Maps business listings collected by the `WORKER-GoogleMapsScraper` bot.

- `name` text
- `address` text
- `website` text
- `phone` text
- `reviews_average` float
- `query` text
- `latitude` float
- `longitude` float
- PRIMARY KEY (`name`, `address`)

### `dns_records` *(planned)*
Proposed table for storing DNS enumeration output. Each record is stored separately to avoid overly large rows.

- `domain` text
- `record_type` text
- `record_value` text
- `scan_date` timestamp
- PRIMARY KEY ((`domain`, `record_type`), `record_value`, `scan_date`)

Bots interacting with these tables include:
- `WORKER-CertStream` – ingesting CertStream feeds
- `WORKER-AutoLighthouse` – running Lighthouse scoring
- `WORKER-AutoWebPageTest` – running WebPageTest scans
- `WORKER-AnalyticsTagHealth` – analytics tag checks
- `WORKER-CarbonAuditor` – carbon footprint audits
- `WORKER-Classify_target` – domain classifier via Ollama
- `WORKER-Whois` – WHOIS updater
- `WORKER-Enrich_processed_domains` – GeoIP and Wappalyzer enrichment
- `WORKER-DomainStatus` – reachability checks
- `WORKER-DedupeDomains` – deduplication helper
- `WORKER-MiscToolResults` – generic results import
- `WORKER-GoogleMapsScraper` – local business gathering
- `WORKER-rightsem-final` – email validation
- `BOT-Hunter[Rust]` – asynchronous crawler
- `BOT-Recon_[Py]` – reconnaissance harness
- `BOT-ripwappalyzer[Js]` – tech fingerprinting via Puppeteer
- `BOT-wappalyzer[Py]` – Python Wappalyzer detection
- `WORKER-WhoisNewestDomains` – new domain discovery
- `ETL-Domains` – ingestion scripts


## Bot and Worker Output Schema

The table below summarizes where each bot or worker stores its results. Unless stated otherwise the storage backend is the Cassandra `domain_discovery` keyspace.

| Bot/Worker | Keyspace | Table/File | Columns | Notes |
|------------|----------|-----------|---------|-------|
| BOT-Hunter[Rust] | domain_discovery | domains | domain, status, created_at, last_attempted, variation_success_json | Discovered domains queue. |
|  | domain_discovery | domain_variations | domain, variation, success, status_code, final_url, redirect_count, attempted_at | HTTP variation results. |
| BOT-Recon_[Py] | (local file) | results.txt | n/a | Saves reconnaissance output locally. |
| BOT-SensorFusion_[Py] | (local file) | results.txt | url_used, detected_tech, http_variation, allowed_methods, directory_status, open_ports, security_headers, cookies, meta_tags, robots_info, sitemap_urls, external_resources, response_headers, waf_name, certificate_details, whois_fields, dns_records, subdomain_info | Combines recon tests with technology fingerprinting. |
| BOT-ripwappalyzer[Js] | (local file) | scan_log.txt | n/a | Puppeteer‑based tech fingerprint log. |
| BOT-wappalyzer[Py] | Postgres | domains | techdetect | Updates technology data in Postgres. |
| ETL-Domains | domain_discovery | domains_processed | domain, tld, subdomains, raw_subdomains, [various enrichment fields] | Scripts migrating CertStream and enrichment data. |
| WORKER-AnalyticsTagHealth | domain_discovery | analytics_tag_health | domain, scan_date, working_variants, scanned_urls, found_analytics, page_results, variant_results, compliance_status | Tracks Google tag presence. |
| WORKER-AutoLighthouse | domain_discovery | domains_processed | desktop_* and mobile_* performance columns, suggestions, lighthouse_version, lighthouse_fetch_time, lighthouse_url | Updates Lighthouse metrics. |
| WORKER-AutoWebPageTest | (file/JSON) | output directory | JSON results | Cassandra integration stub only. |
| WORKER-CarbonAuditor | domain_discovery | carbon_audits | domain, url, scan_date, bytes, co2 | Stores bytes and CO₂ estimates. |
| WORKER-CertStream | domain_discovery | domains_processed | domain, tld, site_type | Inserts domains from CertStream. |
| WORKER-Classify_target | domain_discovery | domains_processed | site_type, site_category, site_type_tags | Adds site type and category. |
| WORKER-DedupeDomains | domain_discovery | domains_processed | all columns in existing row | Normalizes TLDs and removes duplicates. |
| WORKER-DomainStatus | domain_discovery | domains_processed | status, updated | Records reachability and timestamps. |
| WORKER-Enrich_processed_domains | domain_discovery | domains_processed | as_name, as_number, city, continent, continent_code, country, country_code, isp, languages, lat, lon, org, phone, region, region_name, registered, registrar, ssl_issuer, tech_detect, time_zone, title, description, linkedin_url, has_about_page, has_services_page, has_cart_or_product, contains_gtm_or_ga, wordpress_version, server_type, server_version, emails, sitemap_page_count, updated | Adds GeoIP, SSL and tech data. |
| WORKER-GoogleMapsScraper | maps or Postgres/SQLite/CSV | businesses | name, address, website, phone, reviews_average, query, latitude, longitude | Writes business listings. |
| WORKER-MiscToolResults | domain_discovery | misc_tool_results | domain, url, tool_name, scan_date, data | Arbitrary tool output keyed by domain. |
| WORKER-Whois | domain_discovery | domains_processed | registered, registrar, updated | Updates WHOIS dates. |
| WORKER-WhoisNewestDomains | domain_discovery | domains_processed | domain, tld | Adds newly registered domains. |
| WORKER-rightsem-final | (local file) | validated_emails.csv | Domain, Email, Format Valid, MX Record Found, MX Host, MX IP, Country, SMTP Valid, SMTP Reason | Saves validated email results to CSV. |



## Cassandra: `profiles` keyspace
Used by the Express API server for user data.

### `user_profiles`
Stores profile details and saved test results.

- `uid` text PRIMARY KEY
- `first_name` text
- `last_name` text
- `email` text
- `phone` text
- `payment_preference` text
- `domains` text   *(JSON encoded list)*
- `tests` text   *(JSON encoded map)*

### `billing_info`
Billing address and subscription data.

- `uid` text PRIMARY KEY
- `name` text
- `address` text
- `city` text
- `state` text
- `postal_code` text
- `country` text
- `plan` text

### `user_domain_prefs`
Refresh frequency per user for each domain.

- `domain` text
- `tld` text
- `uid` text
- `refresh_hours` int
- PRIMARY KEY ((`domain`, `tld`), `uid`)

## PostgreSQL: maps database (deprecated)
Earlier versions wrote Google Maps business listings to a local Postgres table. The worker now persists these rows to the Cassandra `businesses` table instead. The original columns were:

- `name` TEXT
- `address` TEXT
- `website` TEXT
- `phone` TEXT
- `reviews_average` REAL
- `query` TEXT
- `latitude` DOUBLE PRECISION
- `longitude` DOUBLE PRECISION
- `UNIQUE(name, address)`


## SQLite: `qa_proxy.sqlite3` (deprecated)
The Specsavers sandbox app stored QA proxy data in a local SQLite file. These tables will be migrated to a dedicated `qa_proxy` keyspace in Cassandra:

- `config(key TEXT PRIMARY KEY, value TEXT)`
- `sessions(id TEXT PRIMARY KEY, timestamp TEXT, flows TEXT, processed TEXT)`
- `dimensions(key TEXT PRIMARY KEY, description TEXT, operator TEXT, expected TEXT, pass_msg TEXT, fail_msg TEXT)`


## Query Patterns & Cassandra Optimization
Read heavy queries should partition on `domain` with recent scans ordered by `scan_date`. Wide rows allow efficient writes while keeping the newest metrics clustered together.

JSON blobs are avoided where possible—structured columns make frequent metrics easier to query and update.

## To Add
Columns planned for future tools and scrapers:

- WebPageTest results per URL (load time, speed index, TTFB, etc.)
- Screenshot locations for image conversion utilities
- Contrast heatmap metadata (image dimensions, timestamp)
- Google Maps business scraping output stored in the `businesses` table within the `domain_discovery` keyspace
- DNS enumeration output stored in the `dns_records` table (A, AAAA, MX, NS, TXT, DMARC, SPF)

## Current vs Planned Schema State

The tables above reflect the **current** layout used by the running
workers and API server. Planned adjustments include:

- Moving Lighthouse metrics out of `domains_processed` and into
  the dedicated `domain_page_metrics` table for per‑URL tracking.
- Converting `user_profiles.domains` and `user_profiles.tests` from
  JSON encoded text columns to native Cassandra collection types.
- Adding the additional columns listed in the previous section.

---
Update this file whenever new tables or fields are introduced so all bots and services remain compatible.
