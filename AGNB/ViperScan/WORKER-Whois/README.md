# WHOIS Updater

This worker fetches WHOIS data for domains in the `domains_processed` table and updates the `registered`, `registrar`, and `updated` fields.

It runs with gevent for light concurrency and respects a small rate limit between lookups. If a WHOIS response contains a "Terms of Service" or "README" notice, the worker backs off for 30 seconds before continuing.

## Local Setup

Install Python 3.11 and the dependencies from `requirements.txt`:

```bash
pip install -r requirements.txt
python whois_worker.py
```

The script connects to Cassandra via the default connection settings defined in `whois_worker.py`. Edit the file or set `CASSANDRA_URL` in the environment to point to your cluster.

Build the container and run:

```bash
docker build -t whois-worker .
docker run --rm --network=host whois-worker
```
