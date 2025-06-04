# Domain Enrichment Processor

This worker enriches rows in the `domains_processed` table with
network, geolocation and website metadata.  It resolves each domain,
runs several scanners and then updates Cassandra with the results.

## What it does
- GeoIP lookups for city, region, country and timezone
- ASN and ISP identification
- SSL certificate issuer extraction
- Homepage analysis (title, description, contact details)
- Basic content scraping for phone numbers and emails
- Technology detection using a local Wappalyzer build
- Sitemap size counting

Only domains marked `user_managed = true` are processed.  If a site is
unreachable its `status` field is set to `false`.

## Required files
- `GeoLite2-City.mmdb`
- `GeoLite2-ASN.mmdb`
- Local patched copy of `Wappalyzer` inside this directory

## Running locally
```bash
pip install -r requirements.txt
python enrich_processed_domain.py --status-true-only
```

## Docker
```bash
docker build -t domain-enricher .
docker run --rm \
  -v $(pwd):/app \
  --network=host \
  domain-enricher
```

`--network=host` is required so the container can reach your Cassandra
cluster.

## Output columns
The worker updates the following columns in
`domain_discovery.domains_processed`:

| Column               | Description                                    |
|----------------------|------------------------------------------------|
| `status`             | `true` if the domain responded to HTTP/HTTPS   |
| `updated`            | Timestamp when the row was last touched        |
| `as_name`            | Autonomous system organization                 |
| `as_number`          | ASN in the form `AS12345`                      |
| `city`               | City from GeoIP                                |
| `continent`          | Continent name from GeoIP                      |
| `continent_code`     | Continent code (e.g. `NA`)                     |
| `country`            | Country name                                   |
| `country_code`       | ISO country code                               |
| `isp`                | ISP name from ASN database                     |
| `languages`          | Detected languages from page content           |
| `lat`                | Latitude                                       |
| `lon`                | Longitude                                      |
| `org`                | Organization name from ASN data                |
| `phone`              | List of phone numbers scraped from the site    |
| `region`             | Region/State code                              |
| `region_name`        | Region/State name                              |
| `registered`         | Domain creation date (from WHOIS)              |
| `registrar`          | Registrar name (from WHOIS)                    |
| `ssl_issuer`         | SSL certificate issuer                         |
| `tech_detect`        | JSON object of technologies from Wappalyzer    |
| `time_zone`          | Timezone from GeoIP                            |
| `title`              | Homepage `<title>` text                        |
| `description`        | Meta description                               |
| `linkedin_url`       | First LinkedIn link on the homepage            |
| `has_about_page`     | Whether an "About" page link was seen          |
| `has_services_page`  | Whether a "Services" page link was seen        |
| `has_cart_or_product`| Whether e‑commerce keywords were detected      |
| `contains_gtm_or_ga` | Presence of Google Tag Manager or Analytics    |
| `wordpress_version`  | WordPress version if detected                  |
| `server_type`        | HTTP server type (e.g. `nginx`)                |
| `server_version`     | Server version number                          |
| `emails`             | List of emails found                           |
| `sitemap_page_count` | Total pages listed across sitemaps             |
| `last_enriched`      | Timestamp when enrichment finished             |

Additional information such as WordPress asset versions and
`X-Powered-By` headers is gathered but not currently stored.
