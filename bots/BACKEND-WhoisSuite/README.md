# Whois Suite Worker

This Python worker replaces the previous `BACKEND-Whois` and `BACKEND-WhoisNewestDomains` components.
It downloads newly registered domain lists from whoisds.com, inserts them into
Cassandra, performs WHOIS lookups for domains missing metadata, and then sleeps
for a configurable period (default 12 hours).

## Usage

Install dependencies and run:

```bash
pip install -r requirements.txt
python whois_suite.py
```

Set `INTERVAL_HOURS` to control how often the worker repeats the process. It
reads `CASSANDRA_URL` and `CASSANDRA_KEYSPACE` the same way as the original
workers.
