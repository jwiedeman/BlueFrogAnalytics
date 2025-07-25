# Bot and Worker Output Schema

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
| WORKER-AutoLighthouse | domain_discovery | domains_processed | desktop_* and mobile_* performance columns, suggestions, lighthouse_version, lighthouse_fetch_time, lighthouse_url | Updates Lighthouse metrics. |
| WORKER-AutoWebPageTest | (file/JSON) | output directory | JSON results | Cassandra integration stub only. |
| BACKEND-CarbonAuditor | domain_discovery | carbon_audits | domain, url, scan_date, bytes, co2 | Stores bytes and CO₂ estimates. |
| WORKER-CertStream | domain_discovery | domains_processed | domain, tld, site_type | Inserts domains from CertStream. |
| WORKER-Classify_target | domain_discovery | domains_processed | site_type, site_category, site_type_tags | Adds site type and category. |
| WORKER-DedupeDomains | domain_discovery | domains_processed | all columns in existing row | Normalizes TLDs and removes duplicates. |
| WORKER-Enrich_processed_domains | domain_discovery | domains_processed | as_name, as_number, city, continent, continent_code, country, country_code, isp, languages, lat, lon, org, phone, region, region_name, registered, registrar, ssl_issuer, tech_detect, time_zone, title, description, linkedin_url, has_about_page, has_services_page, has_cart_or_product, contains_gtm_or_ga, wordpress_version, server_type, server_version, emails, sitemap_page_count, updated | Adds GeoIP, SSL and tech data. |
| WORKER-GoogleMapsScraper | maps or Postgres/SQLite/CSV | businesses | name, address, website, phone, reviews_average, query, latitude, longitude | Writes business listings. |
| BACKEND-MiscToolResults | domain_discovery | misc_tool_results | domain, url, tool_name, scan_date, data | Arbitrary tool output keyed by domain. |
| WORKER-WhoisSuite | domain_discovery | domains_processed | domain, tld, registered, registrar, updated | Fetches newly registered domains and updates WHOIS info. |

