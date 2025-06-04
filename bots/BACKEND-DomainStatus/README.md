# Domain Status Worker

This Go worker checks whether domains in the `domains_processed` table are reachable.
It fetches batches of domains with a missing `status` or where `last_checked` is
older than 60 days. Domain names are normalized to remove duplicate periods and
each domain is probed via four URL variations:

```
https://www.example.com
https://example.com
http://www.example.com
http://example.com
```
All four variations are probed concurrently and the first successful response
cancels the others. A domain is only marked **down** if none of the requests
succeed within the timeout.
Results are written back to Cassandra with the current timestamp in
`last_checked` and a boolean `status`. Progress is printed every second showing
totals, processing rate, active workers and the last few checked domains along
with their status.

Updates are queued and written to Cassandra in small batches to reduce
database overhead.

The worker maintains an internal queue of domains (default 3000) so that
individual checks continue without waiting for slower sites to finish.

To reduce 403 responses, each HTTP request includes a randomized
`User-Agent` header that mimics common browsers. A short 5 second timeout is
used for each domain so unresponsive sites don't block progress.

Environment variables:

- `CASSANDRA_HOSTS` – comma-separated list of Cassandra nodes
- `CASSANDRA_KEYSPACE` – keyspace to use (default `domain_discovery`)

 - `CONCURRENCY` – starting number of simultaneous checks (default `CPU * 50`)
 - `MAX_CONCURRENCY` – upper limit for worker count (default `CPU * 200`)
 - `MIN_CONCURRENCY` – lower limit for worker count (default `CPU * 10`)
 - `ADJUST_STEP` – how many workers to add or remove when tuning (default `CPU * 5`)
 - `ADJUST_INTERVAL` – seconds between throughput checks (default `30`)
- `BATCH_SIZE` – how many domains to fetch in each loop (default `300`)
- `POOL_SIZE` – number of domains to keep queued for workers (default `3000`)
- `AUTO_SCALE` – when set to `false` the worker count stays fixed and the
  concurrency adjuster is disabled (default `true`)
- `DNS_SERVERS` – comma-separated DNS resolvers used for lookups. When multiple
  servers are provided, queries are round-robined across them. Defaults to a
  list of public resolvers (Cloudflare, Google, Quad9, OpenDNS, Comodo,
  DNS.WATCH, CleanBrowsing, Yandex, Level3).


Run with `go run .` or build a binary using `go build`.

## Docker

Build the container and run:

```bash
docker build -t domain-status-worker .
docker run --rm --network=host domain-status-worker
```

Use `--network=host` if your Cassandra nodes are accessible on the host network.

## Docker Swarm

This image can also run as a service in Docker Swarm after being built and pushed to your registry.

```bash
docker service create --name <service-name> --env-file .env <image>:latest
```

Alternatively include the service in a stack file and deploy with `docker stack deploy`.
