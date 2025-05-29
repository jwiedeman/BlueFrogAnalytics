🌐 Domain Enrichment Processor
------------------------------

> Real-time web domain analysis for SSL, geo, language, registrar, ASN, and stack tech --- **faster than your DNS can blink.**

* * * * *

### 🧠 What This Is

This is a **concurrent domain enrichment tool** written in Python, built to run efficiently against a Cassandra-backed data store. It resolves and analyzes domains pulled from a `domains_processed` table and updates them with:

-   ✅ GeoIP (City, Country, Lat/Lon, Timezone, etc.)

-   ✅ ASN & ISP info


-   ✅ SSL certificate org & issuer

-   ✅ Website content characteristics (languages, phone numbers, zipcodes)

-   ✅ Tech stack detection via Wappalyzer (offline mode)

It is **Dockerized**, highly configurable, and engineered for **fast enrichment in bulk.**

* * * * *

### 🧩 Requirements

This script **requires** the following local files to function correctly:

-   `GeoLite2-City.mmdb`

-   `GeoLite2-ASN.mmdb`

-   A **patched** or forked version of `Wappalyzer` installed locally in the container (with offline support + timeout tweaks)

* * * * *

### 🗂 Directory Structure

bash

CopyEdit

`enrich-processor/
├── enrich_processed_domain.py
├── Dockerfile
├── requirements.txt
├── GeoLite2-City.mmdb
├── GeoLite2-ASN.mmdb
└── wappalyzer/           # Custom module fork or patch goes here`

* * * * *

### 🐳 Dockerfile (Recap)

This project uses the following `Dockerfile` (already provided):

dockerfile

CopyEdit

`FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends\
    build-essential\
    libmaxminddb0\
    && rm -rf /var/lib/apt/lists/*

COPY . /app

RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "enrich_processed_domain.py"]`

* * * * *

### 🧾 requirements.txt

text

CopyEdit

`gevent
certifi
cassandra-driver
python-whois
pytz
tldextract
langdetect
geoip2
requests
pycountry
Wappalyzer @ file:///app/wappalyzer  # Local patched version`

Make sure your custom Wappalyzer fork is installed **locally from the directory**, not PyPI.

* * * * *

### Local Setup

Install Python 3.11 and the required packages:

```bash
pip install -r requirements.txt
python enrich_processed_domain.py --status-true-only
```

Edit `enrich_processed_domain.py` if your Cassandra nodes differ from the defaults.

* * * * *

### 🚀 Build & Run

#### 1\. **Build the container**

bash

CopyEdit

`docker build -t domain-enricher .`

#### 2\. **Run with local volume (to access mmdb files and local wappalyzer)**

bash

CopyEdit

`docker run --rm\
  -v $(pwd):/app\
  --network=host\
  domain-enricher`

> Note: `--network=host` is required to access your Cassandra cluster running on the host (e.g. `192.168.1.201`).

* * * * *

### ⚠️ Critical Dependencies

This system **will not work** if:

-   ✅ The `.mmdb` files are missing

-   ✅ The Wappalyzer package is not your **custom local patched version**

-   ❌ Wappalyzer times out or fails to parse local content due to known PyPI bugs

-   ❌ Cassandra is unreachable on the listed IPs

* * * * *

### 🔒 Tips for Smooth Ops

-   Mount your data directory properly if running from a CI/CD pipeline.

-   Consider setting a `--max-concurrency` flag in the future for dynamic tuning.

-   Logs are output to stdout --- pipe them to a log file if needed.

* * * * *

### 🤖 TARS Says:

> "You're trying to run 50 concurrent SSL scans and Geo lookups... in Docker... on slim Python...\
> You're either brilliant... or about to melt your NIC. Either way, I approve."

* * * * *

### 📈 What's Next?

-   Add `dotenv` support for IPs, DC names, and DB names

-   Output to optional JSON or CSV for quick analysis

-   Support fallback if any MMDB isn't present

-   Add dashboard for batch progress

* * * * *

### 🪐 License

Use. Break. Patch. Improve.\
Just don't push this thing live on a Raspberry Pi and wonder why it's on fire.