
Suite of backend workers and bots for large scale domain intelligence gathering.
Each component lives in its own folder and can run independently.

## Components
- `BACKEND-CertStream` – Go service ingesting CertStream feeds.
- `BACKEND-AutoLighthouse` – Node.js Lighthouse auditor.
- `BACKEND-AutoWebPageTest` – Node.js crawler using WebPageTest.
- `BACKEND-Classify_target` – Go classifier powered by Ollama.
- `BACKEND-Enrich_processed_domains` – Python enrichment pipeline with GeoIP and Wappalyzer.
- `BACKEND-DomainStatus` – Go reachability checker.
- `BACKEND-DedupeDomains` – Go utility that normalizes TLDs and removes duplicate records.
- `BOT-Hunter[Rust]` – asynchronous crawler written in Rust.
- `BOT-Recon_[Py]` – modular reconnaissance harness.
- `BOT-ripwappalyzer[Js]` – Puppeteer-based tech fingerprinting script.
- `BOT-wappalyzer[Py]` – Python technology detection using the Wappalyzer library.
- `BACKEND-WhoisSuite` – Python worker combining newest-domain scraping and WHOIS updates.
- `ETL-Domains` – helper scripts for data ingestion and enrichment.
- `DB[Cfg]` – Docker assets for running Cassandra clusters.

Refer to each subdirectory's README for build and usage instructions.

## Docker Swarm

This image can also run as a service in Docker Swarm after being built and pushed to your registry.

```bash
docker service create --name <service-name> --env-file .env <image>:latest
```

Alternatively include the service in a stack file and deploy with `docker stack deploy`.
