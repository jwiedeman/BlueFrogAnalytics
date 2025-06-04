# Sensor Fusion Bot (Python)

This experimental tool combines capabilities from the existing Recon test runner
and a lightweight technology fingerprinting engine. It reuses the dynamic test
loading system from `BOT-Recon_[Py]` and adds a new test which runs the custom
detector against a target domain.

Run `main.py` with the same flags as the Recon bot. Additional options allow
invoking the fingerprinting engine directly:

```bash
python main.py --target example.com --all --verbose
# run full suite

# Run only the fingerprinting engine
python main.py --target example.com --fingerprint-only

# Fingerprint first then run selected tests
python main.py --target example.com --fingerprint --tests test_ssl test_whois
```

The new test `test_detector_integration.py` attempts multiple HTTP/HTTPS
variants of the target until technology fingerprints are found using the custom
detector.

To expose the technology database to the rest of the tests a helper module
`tech_data.py` loads the `technologies.json` file. A local copy of
`technologies.json`, `categories.json` and `groups.json` is stored under the
`data/` directory. The helper exposes `get_detector()` which returns a simple
object wrapping the matcher. A convenience `load_full_tech_data()` function
returns the raw groups, categories and technologies dictionaries for custom
analysis.

The repository includes the full technology set compiled from the original
open-source Wappalyzer data. The raw detection files live locally under
`src/technologies`, making this bot self-contained. Run
`scripts/compile_tech_data.py` to rebuild `data/technologies.json`. The
precompiled file contains over 5,000 technology definitions.

All existing tests from `BOT-Recon_[Py]` are discovered automatically, allowing
the full reconnaissance suite to run alongside the fingerprinting engine.

## Additional Tests

A second test `test_crosscheck_server.py` compares the server detection output from
`BOT-Recon_[Py]`'s `test_server_fingerprinting.py` with detector results. It
reports any overlap between the two techniques to help validate fingerprinting
accuracy.

The third test `test_detector_categories.py` lists detected technologies along
with their versions, categories and groups for quick reference.

The new test `test_detector_dataset.py` demonstrates loading the raw
categories and technologies using `tech_data` and runs detection through
the custom engine.

`test_simple_matcher.py` demonstrates the bundled matcher in
`tech_matcher.py`. It mirrors the original logic for URL,
header, HTML, script, cookie and meta pattern checks and resolves implied
technologies. The matcher also supports basic JS, DOM and DNS rules.
Versions, categories and high‑level groups are exposed for each detected
technology along with an aggregate confidence score calculated from the
matched patterns.

## Output Columns

When the suite is executed the bot saves a `results.txt` file. Each test writes
structured information that can be turned into columns for later analysis. The
combined output currently includes:

- **URL used** – address that produced the result (most tests report this).
- **Detected technologies** – name, version, categories and groups from the
  detector.
- **Groups loaded**, **Categories loaded** and **Technologies loaded** – counts
  from `test_detector_dataset.py`.
- **Detector servers**, **Server fingerprinting** and **Overlap** – server
  comparison from `test_crosscheck_server.py`.
- **HTTP variation**, **Initial URL**, **Redirect chain**, **Final URL** and
  **Final status code** from the basic response test.
- **Allowed methods** from the HTTP methods test.
- **Directory path**, **HTTP status** and a short **content snippet** produced by
  directory enumeration.
- **Open port status** for ports 80, 443, 8080, 22 and 21.
- **X-Frame-Options**, **X-Content-Type-Options**, **Content-Security-Policy**,
  **Referrer-Policy**, **X-XSS-Protection** and **Strict-Transport-Security**
  header values from the HTTP security headers test.
- **Set-Cookie presence** from the cookie settings test.
- **Meta tag totals** along with detected Open Graph, Twitter and standard meta
  tags.
- **robots.txt**, **security.txt** and **.well-known/security.txt** retrieval
  results plus any sitemap URLs found.
- **Sitemap URLs** and cross-reference details from the sitemap comparison test.
- **External resource list** from the external resources test.
- **Server response headers** and any detected web application firewall (WAF)
  names.
- **Certificate details** including handshake time, TLS version, cipher suite,
  ALPN/NPN protocols, session reuse, compression, forward secrecy, issuer,
  subject, validity dates, days until expiration, serial number, certificate
  version, signature algorithm, public key info, SHA256 fingerprint and subject
  alternative names.
- **WHOIS record fields** from the whois test (domain name, registrar, dates,
  name servers, DNSSEC, etc.).
- **DNS records** (A, AAAA, MX, NS, TXT, DMARC and SPF) from DNS enumeration.
- **Passive subdomain count** and sample list from the subdomain gathering test.

Refer to `results.txt` in this directory for a complete example of the raw
output that contains these columns.

### Storage Considerations

The bot currently saves results locally, but the long term plan is to feed
key metrics into Cassandra. DNS enumeration can return multiple records per
domain. Rather than storing a huge JSON blob, records will be written to the
`dns_records` table using the structure described in `db_schema.md`. Each
row contains the domain, record type, individual value and scan date so that
queries remain efficient.

