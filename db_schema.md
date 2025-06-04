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

