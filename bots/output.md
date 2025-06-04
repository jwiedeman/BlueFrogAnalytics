# Bot and Worker Output Schema

The table below summarizes where each bot or worker stores its results. Unless stated otherwise the storage backend is the Cassandra `domain_discovery` keyspace.

| Bot/Worker | Keyspace | Table/File | Notes |
|------------|----------|-----------|-------|
| BOT-Hunter[Rust] | domain_discovery | domains, domain_variations | Inserts discovered domains and HTTP variation results. |
| BOT-Recon_[Py] | (local file) | results.txt | Saves reconnaissance output locally. |
| BOT-SensorFusion_[Py] | (local file) | results.txt | Combines recon with tech detection. |
| BOT-ripwappalyzer[Js] | (local file) | scan_log.txt | Puppeteer‑based tech fingerprint log. |
| BOT-wappalyzer[Py] | Postgres | domains | Updates `techdetect` column in Postgres. |
| ETL-Domains | domain_discovery | domains_processed | Various ETL scripts populating processed domains. |
| WORKER-AnalyticsTagHealth | domain_discovery | analytics_tag_health | Tracks Google tag presence. |
| WORKER-AutoLighthouse | domain_discovery | domains_processed | Updates Lighthouse metrics. |
| WORKER-AutoWebPageTest | (file/JSON) | output directory | Cassandra integration stub only. |
| WORKER-CarbonAuditor | domain_discovery | carbon_audits | Stores bytes and CO₂ estimates. |
| WORKER-CertStream | domain_discovery | domains_processed | Inserts domains from CertStream. |
| WORKER-Classify_target | domain_discovery | domains_processed | Adds site type and category. |
| WORKER-DedupeDomains | domain_discovery | domains_processed | Normalizes TLDs and removes duplicates. |
| WORKER-DomainStatus | domain_discovery | domains_processed | Records reachability and timestamps. |
| WORKER-Enrich_processed_domains | domain_discovery | domains_processed | Adds GeoIP, SSL and tech data. |
| WORKER-GoogleMapsScraper | maps or Postgres/SQLite/CSV | businesses | Writes business listings depending on storage mode. |
| WORKER-MiscToolResults | domain_discovery | misc_tool_results | Arbitrary tool output keyed by domain. |
| WORKER-Whois | domain_discovery | domains_processed | Updates registrar and registration dates. |
| WORKER-WhoisNewestDomains | domain_discovery | domains_processed | Adds newly registered domains. |
| WORKER-rightsem-final | (local file) | validated_emails.csv | Saves validated email results to CSV. |

