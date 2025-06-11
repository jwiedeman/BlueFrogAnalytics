# Database Schema

This document consolidates the main data stores used across Blue Frog Analytics. Each table lists the fields we **currently** save and optional fields we could store if we captured the full output of the underlying tool.

## Cassandra

### `domain_discovery` keyspace

| Table | Saved Columns | Optional Columns |
| ----- | ------------- | ---------------- |
| **domains** | `domain` (PK), `status`, `created_at`, `last_attempted`, `variation_success_json` | `first_certstream_seen`, `source`, `notes` |
| **domain_variations** | `domain`, `variation`, `success`, `status_code`, `final_url`, `redirect_count`, `attempted_at` | `response_headers`, `ip_address`, `screenshot_path` |
| **certstream_domains** | `domain` (PK) | `first_seen`, `cert_seen_at` |
| **domains_processed** | `domain`, `tld`, enrichment fields (GeoIP, SSL, tech), classification flags, Lighthouse scores, suggestions, `user_managed`, `refresh_hours`, `last_enriched`, `raw_subdomains` | WebPageTest metrics, screenshot URLs, carbon estimates, DNS details, full analytics tag data |
| **domain_page_metrics** | `domain`, `url`, `scan_date`, Lighthouse metrics per URL | network request breakdown, PWA category metrics |
| **analytics_tag_health** | `domain`, `scan_date`, `working_variants`, `scanned_urls`, `found_analytics`, `page_results`, `variant_results`, `compliance_status` | DOM screenshots, network logs |
| **carbon_audits** | `domain`, `url`, `scan_date`, `bytes`, `co2` | `first_byte_time`, full waterfall data |
| **misc_tool_results** | `domain`, `url`, `scan_date`, `tool_name`, `data` | typed fields for additional tools |
| **businesses** | `name`, `address`, `website`, `phone`, `reviews_average`, `query`, `latitude`, `longitude` | `rating_count`, `opening_hours`, `categories` |
| **dns_records** | `domain`, `record_type`, `record_value`, `scan_date` | `ttl`, `record_class` |

### `blue_frog` keyspace

This keyspace mirrors the tables in `domain_discovery` but **all collection
types are stored as plain `TEXT`**. Lists, sets and maps are JSON encoded so the
API and workers can query fields without running into collection type issues.

| Table | Primary key columns |
| ----- | ------------------- |
| **certstream_domains** | `domain` |
| **domains_processed** | (`domain`, `tld`) |
| **domain_page_metrics** | (`domain`, `url`, `scan_date`) |
| **analytics_tag_health** | (`domain`, `scan_date`) |
| **carbon_audits** | (`domain`, `url`, `scan_date`) |
| **dns_records** | (`domain`, `record_type`, `record_value`, `scan_date`) |
| **misc_tool_results** | (`domain`, `url`, `scan_date`) |
| **businesses** | (`name`, `address`) |
| **tracking_specs** | ((`category`, `tool`), `name`) |

All column names match those in `domain_discovery`. Any `list`, `set` or `map`
columns have been replaced with `TEXT` containing JSON so legacy clients can
query the data without collection type issues. Primary keys and clustering
columns mirror the original tables so row ordering and query patterns remain
compatible.

### `profiles` keyspace

| Table | Saved Columns | Optional Columns |
| ----- | ------------- | ---------------- |
| **user_profiles** | `uid` (PK), `first_name`, `last_name`, `email`, `phone`, `payment_preference`, `domains`, `tests` | `timezone`, `avatar_url`, `settings` |
| **billing_info** | `uid` (PK), `name`, `address`, `city`, `state`, `postal_code`, `country`, `plan` | `vat_id`, `payment_provider`, `last_payment_date` |
| **user_domain_prefs** | (`domain`, `tld`, `uid`) PK, `refresh_hours` | `threshold_score_to_notify`, `last_notification` |

## Deprecated Stores

- **PostgreSQL maps database** – replaced by the `businesses` table.
- **SQLite qa_proxy.sqlite3** – QA proxy data slated for migration to Cassandra.

## Notes on Query Patterns

Use wide rows partitioned by `domain` with scans ordered by `scan_date` for efficient writes and reads. JSON blobs are avoided when possible to keep metrics queryable.


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
- `postal_code` text
- `continent` text
- `continent_code` text
- `lat` float
- `lon` float
- `languages` text (JSON array)
- `phone` text
- `phone_numbers` text (JSON array)
- `sms_numbers` text (JSON array)
- `addresses` text (JSON array)
- `time_zone` text

SSL and technology:
- `ssl_issuer` text
- `ssl_org` text
- `x_powered_by` text
- `tech_detect` text (JSON array)
- `wordpress_asset_version` text

Categorisation and content flags:
- `site_type` text
- `site_category` text
- `site_type_tags` text (JSON array)
- `title` text
- `description` text
- `linkedin_url` text
- `has_about_page` boolean
- `has_services_page` boolean
- `has_cart_or_product` boolean
- `more_than_5_internal_links` boolean
- `contains_gtm_or_ga` boolean
- `wordpress_version` text
- `server_type` text
- `server_version` text
- `wpjson_size_bytes` int
- `wpjson_contains_cart` boolean
- `emails` text (JSON array)
- `ecommerce_platforms` text (JSON array)
- `sitemap_page_count` int
- `canonical_url` text
- `favicon_url` text
- `robots_txt_exists` boolean
- `robots_txt_content` text
- `h1_count` int
- `h2_count` int
- `h3_count` int
- `schema_markup_detected` boolean
- `schema_types` text (JSON array)
- `security_headers_score` int
- `security_headers_detected` text (JSON array)
- `hsts_enabled` boolean
- `cookie_compliance` boolean
- `third_party_scripts` int
- `color_contrast_issues` int
- `aria_landmark_count` int
- `form_accessibility_issues` int
- `social_media_profiles` text (JSON array)
- `rss_feed_detected` boolean
- `newsletter_signup_detected` boolean
- `cdn_detected` boolean
- `http_version` text
- `compression_enabled` boolean
- `cache_control_headers` text
- `page_weight_bytes` int
- `main_language` text
- `content_keywords` text

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
- `status_code` int
- `redirect_chain` text (JSON array)
- `page_load_time_ms` int
- `broken_links_count` int
- `internal_links_count` int
- `external_links_count` int
- `page_images_count` int
- `missing_alt_text_images_count` int
- `video_embeds_count` int
- `iframe_embeds_count` int
- `duplicate_meta_titles` boolean
- `duplicate_meta_descriptions` boolean
- `emails` text (JSON array)
- `phone_numbers` text (JSON array)
- `sms_numbers` text (JSON array)
- `addresses` text (JSON array)

User tracking:
- `user_managed` boolean
- `refresh_hours` int
- `last_enriched` timestamp

Subdomains:
- `raw_subdomains` set<text>
- `open_ports` text
- `allowed_http_methods` text
- `waf_name` text
- `directory_scan` text
- `certificate_info` text

### `domain_page_metrics`
Table storing per-URL Lighthouse and page metrics gathered by
`WORKER-Medusa` and related tools.

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
- `status_code` int
- `redirect_chain` text (JSON array)
- `page_load_time_ms` int
- `broken_links_count` int
- `internal_links_count` int
- `external_links_count` int
- `page_images_count` int
- `missing_alt_text_images_count` int
- `video_embeds_count` int
- `iframe_embeds_count` int
- `duplicate_meta_titles` boolean
- `duplicate_meta_descriptions` boolean
- `emails` text (JSON array)
- `phone_numbers` text (JSON array)
- `sms_numbers` text (JSON array)
- `addresses` text (JSON array)
- `wpt_load_time_ms` int
- `wpt_speed_index` float
- `wpt_ttfb_ms` int
- `screenshot_path` text
- `heatmap_path` text

#### Columns updated by `WORKER-AutoLighthouse`

The Lighthouse worker runs audits in both desktop and mobile modes. Each metric is
stored in `domains_processed` as a pair of columns. The following table maps those
pairs:

| Desktop column | Mobile column | Description |
| -------------- | ------------ | ----------- |
| `desktop_performance_score` | `mobile_performance_score` | Performance category score |
| `desktop_accessibility_score` | `mobile_accessibility_score` | Accessibility category score |
| `desktop_best_practices_score` | `mobile_best_practices_score` | Best Practices score |
| `desktop_seo_score` | `mobile_seo_score` | SEO score |
| `desktop_first_contentful_paint` | `mobile_first_contentful_paint` | First Contentful Paint (ms) |
| `desktop_largest_contentful_paint` | `mobile_largest_contentful_paint` | Largest Contentful Paint (ms) |
| `desktop_interactive` | `mobile_interactive` | Time to Interactive (ms) |
| `desktop_speed_index` | `mobile_speed_index` | Speed Index (ms) |
| `desktop_total_blocking_time` | `mobile_total_blocking_time` | Total Blocking Time (ms) |
| `desktop_cumulative_layout_shift` | `mobile_cumulative_layout_shift` | Cumulative Layout Shift |
| `desktop_timing_total` | `mobile_timing_total` | Total Lighthouse timing (ms) |
| `desktop_performance_suggestions` | `mobile_performance_suggestions` | Top performance opportunities |
| `desktop_accessibility_suggestions` | `mobile_accessibility_suggestions` | Failing accessibility audits |
| `desktop_seo_suggestions` | `mobile_seo_suggestions` | Failing SEO audits |
| `lighthouse_version` | – | Lighthouse version used |
| `lighthouse_fetch_time` | – | Timestamp of the scan |
| `lighthouse_url` | – | Final audited URL |

The CLI `run` command outputs a smaller CSV/JSON format with these columns:

`url`, `performance`, `accessibility`, `best-practices`, `seo`, `pwa`, `firstContentfulPaint`, `performanceSuggestions`, `accessibilitySuggestions`, `seoSuggestions`.

#### Additional fields collected by `WORKER-Medusa`
The Medusa enrichment step also captures several homepage indicators that are now stored in Cassandra:
- `postal_code`
- `ssl_org`
- `x_powered_by`
- `wordpress_asset_version`
- `wpjson_size_bytes`
- `wpjson_contains_cart`
- `more_than_5_internal_links`
- `ecommerce_platforms`
- `open_ports`
- `allowed_http_methods`
- `waf_name`
- `directory_scan`
- `certificate_info`
- `meta_tag_count`
- `sitemap_robots_conflict`
- `insecure_cookie_count`
- `external_resource_count`
- `passive_subdomain_count`
- `phone_numbers`
- `sms_numbers`
- `addresses`

#### Columns updated by `WORKER-Medusa`

Medusa orchestrates all scans and populates columns across several tables.

**domains_processed**

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
- `sitemap_page_count`
- `last_enriched`
- `ssl_org`
- `x_powered_by`
- `wordpress_asset_version`
- `wpjson_size_bytes`
- `wpjson_contains_cart`
- `more_than_5_internal_links`
- `ecommerce_platforms`
- `postal_code`
- `desktop_performance_score`
- `mobile_performance_score`
- `desktop_accessibility_score`
- `mobile_accessibility_score`
- `desktop_best_practices_score`
- `mobile_best_practices_score`
- `desktop_seo_score`
- `mobile_seo_score`
- `desktop_first_contentful_paint`
- `mobile_first_contentful_paint`
- `desktop_largest_contentful_paint`
- `mobile_largest_contentful_paint`
- `desktop_interactive`
- `mobile_interactive`
- `desktop_speed_index`
- `mobile_speed_index`
- `desktop_total_blocking_time`
- `mobile_total_blocking_time`
- `desktop_cumulative_layout_shift`
- `mobile_cumulative_layout_shift`
- `desktop_timing_total`
- `mobile_timing_total`
- `desktop_performance_suggestions`
- `mobile_performance_suggestions`
- `desktop_accessibility_suggestions`
- `mobile_accessibility_suggestions`
- `desktop_seo_suggestions`
- `mobile_seo_suggestions`
- `lighthouse_version`
- `lighthouse_fetch_time`
- `lighthouse_url`

**analytics_tag_health**

- `domain`
- `scan_date`
- `working_variants`
- `scanned_urls`
- `found_analytics`
- `page_results`
- `variant_results`
- `compliance_status`

**carbon_audits**

- `domain`
- `url`
- `scan_date`
- `bytes`
- `co2`

**dns_records**

- `domain`
- `record_type`
- `record_value`
- `scan_date`

**misc_tool_results**

- `domain`
- `url`
- `scan_date`
- `tool_name`
- `data`
### `analytics_tag_health`
Detailed analytics and tag compliance results.

- `domain` text
- `scan_date` timestamp
- `working_variants` text (JSON array)
- `scanned_urls` text (JSON array)
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

### `tracking_specs`
Reference table for analytics events and dimensions. Used by the dashboard to
provide a data dictionary and future rule engine.

- `category` text *(event, dimension, etc.)*
- `tool` text *(google_analytics, adobe_analytics, etc.)*
- `name` text
- `rule` text *(pattern used to detect the item)*
- `example` text
- `description` text
- `updated_at` timestamp
- PRIMARY KEY ((`category`, `tool`), `name`)

### `dns_records` *(planned)*
Proposed table for storing DNS enumeration output. Each record is stored separately to avoid overly large rows.

- `domain` text
- `record_type` text
- `record_value` text
- `scan_date` timestamp
- PRIMARY KEY ((`domain`, `record_type`), `record_value`, `scan_date`)

- Bots interacting with these tables include:
- `WORKER-CertStream` – ingesting CertStream feeds
- `WORKER-AutoLighthouse` – running Lighthouse scoring (columns below)
- `WORKER-AutoWebPageTest` – running WebPageTest scans
- `BACKEND-AnalyticsTagHealth` – analytics tag checks
- `BACKEND-CarbonAuditor` – carbon footprint audits
- `WORKER-Classify_target` – domain classifier via Ollama
- `WORKER-WhoisSuite` – new domain discovery and WHOIS updater
- `WORKER-Enrich_processed_domains` – GeoIP and Wappalyzer enrichment
- `WORKER-DedupeDomains` – deduplication helper
- `BACKEND-MiscToolResults` – generic results import
- `WORKER-GoogleMapsScraper` – local business gathering
- `BOT-Hunter[Rust]` – asynchronous crawler
- `BOT-Recon_[Py]` – reconnaissance harness
- `BOT-ripwappalyzer[Js]` – tech fingerprinting via Puppeteer
- `BOT-wappalyzer[Py]` – Python Wappalyzer detection
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
| BACKEND-AnalyticsTagHealth | domain_discovery | analytics_tag_health | domain, scan_date, working_variants, scanned_urls, found_analytics, page_results, variant_results, compliance_status | Tracks Google tag presence. |
| WORKER-AutoLighthouse | domain_discovery | domains_processed | see section below | Updates Lighthouse metrics. |
| WORKER-AutoWebPageTest | (file/JSON) | output directory | JSON results | Cassandra integration stub only. |
| BACKEND-CarbonAuditor | domain_discovery | carbon_audits | domain, url, scan_date, bytes, co2 | Stores bytes and CO₂ estimates. |
| WORKER-CertStream | domain_discovery | domains_processed | domain, tld, site_type | Inserts domains from CertStream. |
| WORKER-Classify_target | domain_discovery | domains_processed | site_type, site_category, site_type_tags | Adds site type and category. |
| WORKER-DedupeDomains | domain_discovery | domains_processed | all columns in existing row | Normalizes TLDs and removes duplicates. |
| WORKER-Enrich_processed_domains | domain_discovery | domains_processed | as_name, as_number, city, continent, continent_code, country, country_code, isp, languages, lat, lon, org, phone, region, region_name, registered, registrar, ssl_issuer, tech_detect, time_zone, title, description, linkedin_url, has_about_page, has_services_page, has_cart_or_product, contains_gtm_or_ga, wordpress_version, server_type, server_version, emails, sitemap_page_count, updated | Adds GeoIP, SSL and tech data. |
| WORKER-GoogleMapsScraper | maps or Postgres/SQLite/CSV | businesses | name, address, website, phone, reviews_average, query, latitude, longitude | Writes business listings. |
| BACKEND-MiscToolResults | domain_discovery | misc_tool_results | domain, url, tool_name, scan_date, data | Arbitrary tool output keyed by domain. |
| WORKER-SpecDemo | domain_discovery | tracking_specs | category, tool, name, rule, example, description, updated_at | Seeds demo specification rows. |
| WORKER-WhoisSuite | domain_discovery | domains_processed | domain, tld, registered, registrar, updated | Fetches newly registered domains and updates WHOIS info. |
| WORKER-Medusa | domain_discovery | multiple tables | see section above | Orchestrates all scans and writes to every table. |



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
Future enhancements may include additional PWA metrics and detailed network request data. Most of the previously planned tables are now populated by `WORKER-Medusa`.

## Current vs Planned Schema State

The tables above reflect the **current** layout used by the running
workers and API server. Lighthouse metrics are now stored in the
`domain_page_metrics` table. Remaining work includes converting
`user_profiles.domains` and `user_profiles.tests` from JSON encoded
text columns to native Cassandra collection types.

---
Update this file whenever new tables or fields are introduced so all bots and services remain compatible.

