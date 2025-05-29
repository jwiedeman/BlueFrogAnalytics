# ViperScan

Suite of workers and bots for large scale domain intelligence gathering.
Each component lives in its own folder and can run independently.

## Components
- `WORKER-CertStream` – Go service ingesting CertStream feeds.
- `WORKER-AutoLighthouse` – Node.js Lighthouse auditor.
- `WORKER-AutoWebPageTest` – Node.js crawler using WebPageTest.
- `WORKER-Classify_target` – Go classifier powered by Ollama.
- `WORKER-Whois` – Python WHOIS updater.
- `WORKER-Enrich_processed_domains` – Python enrichment pipeline with GeoIP and Wappalyzer.
- `WORKER-DomainStatus` – Go reachability checker.
- `BOT-Hunter[Rust]` – asynchronous crawler written in Rust.
- `BOT-ripwappalyzer[Js]` – Puppeteer-based tech fingerprinting script.
- `BOT-wappalyzer[Py]` – Python technology detection using the Wappalyzer library.
- `BOT-whois-newest-domains[Go]` – pulls newly registered domains from whoisds.com.
- `ETL-Domains` – helper scripts for data ingestion and enrichment.
- `DB[Cfg]` – Docker assets for running Cassandra clusters.

Refer to each subdirectory's README for build and usage instructions.
