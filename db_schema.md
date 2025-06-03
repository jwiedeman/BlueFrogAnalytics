# Database Schema

This document outlines the primary data stores used across the Blue Frog Analytics project. Bots and services update these tables regularly. Schema changes should be recorded here so all processes remain in sync.

## Cassandra: `domain_discovery` keyspace

### `certstream_domains`
Temporary table populated from certificate transparency logs before domains are parsed.

- `domain` text PRIMARY KEY

### `domains_processed`
Main table for normalized domains and enrichment data.

Initial columns include:
- `domain` text
- `tld` text
- `raw_subdomains` set<text>
- `status` boolean
- `updated` timestamp

Additional fields are added over time. See `bots/WORKER-Enrich_processed_domains/schema_updates.cql` for the latest columns such as `title`, `description`, `more_than_5_internal_links`, `contains_gtm_or_ga`, `emails`, `wordpress_version`, `server_type`, `server_version`, `wpjson_size_bytes`, `wpjson_contains_cart`, `linkedin_url`, `has_about_page`, `has_services_page`, `has_cart_or_product`, `sitemap_page_count` and Lighthouse metrics for both desktop and mobile audits.

Bots interacting with this table include:
- `ETL-Domains` for ingesting CertStream data
- `DomainStatus` for reachability checks
- `AutoLighthouse` for Lighthouse scoring
- `rightsem-final` for technology classification
- `Enrich_processed_domains` for content analysis

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
- `domains` text
- `tests` text

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

## PostgreSQL: maps database
The Google Maps Scraper worker writes business listings to a local Postgres table created on startup:

- `name` TEXT
- `address` TEXT
- `website` TEXT
- `phone` TEXT
- `reviews_average` REAL
- `query` TEXT
- `latitude` DOUBLE PRECISION
- `longitude` DOUBLE PRECISION
- `UNIQUE(name, address)`

## SQLite: `qa_proxy.sqlite3`
The Specsavers sandbox app persists data to a small local SQLite database with the following tables:

- `config(key TEXT PRIMARY KEY, value TEXT)`
- `sessions(id TEXT PRIMARY KEY, timestamp TEXT, flows TEXT, processed TEXT)`
- `dimensions(key TEXT PRIMARY KEY, description TEXT, operator TEXT, expected TEXT, pass_msg TEXT, fail_msg TEXT)`

---
Update this file whenever new tables or fields are introduced so all bots and services remain compatible.
