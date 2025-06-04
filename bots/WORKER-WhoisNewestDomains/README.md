# Whois Newest Domains Worker

A Go based worker that scrapes newly registered domains from whoisds.com and inserts them into the Cassandra cluster used by the other Whois workers. It can also export all domains to CSV.

## Features
- Scrapes download links for newly-registered domains
- Downloads and processes ZIP archives in memory with UTF-8/ISO-8859-1 fallback
- Inserts unique domains into a Cassandra table (`domains_processed`)
- Writes all domains to `all_downloaded_domains.csv`
- Supports `--csv` flag to export CSV only (skips DB insertion)
- Configuration via environment variables (dotenv support)
- Multi-stage Docker build for a minimal runtime image

## Prerequisites
- Go toolchain (1.23+)
- Access to a Cassandra cluster with a `domains_processed` table
- Docker for containerized builds and deployment (optional)

## Configuration
1. Create a `.env` file at the project root or export environment variables:
```bash
CASSANDRA_URL=192.168.1.201:9042,192.168.1.202:9042
CASSANDRA_KEYSPACE=domain_discovery
```
2. The application reads `CASSANDRA_URL` and `CASSANDRA_KEYSPACE`.

## Building

### Locally
```bash
git clone <repo_url>
cd WORKER-WhoisNewestDomains
go build -o whois_grabber
```

### Docker
```bash
# Build the Docker image
docker build -t whois-newest-worker .

# Run the container (scheduled mode)
docker run --rm \
  -e CASSANDRA_URL=192.168.1.201:9042 \
  -e CASSANDRA_KEYSPACE=domain_discovery \
  whois-newest-worker

# CSV only mode
docker run --rm \
  -v "$(pwd):/app" \
  -e CASSANDRA_URL=192.168.1.201:9042 \
  -e CASSANDRA_KEYSPACE=domain_discovery \
  whois-newest-worker --csv
```

When run in Docker, the image simply executes the grabber once and then exits. Schedule the container with your preferred tool (e.g. `cron` or a Kubernetes `CronJob`) to run daily.

## Usage
Run the binary directly or via Docker. By default, it inserts into Cassandra. Pass `--csv` to export CSV only.
```bash
# Local DB mode
./whois_grabber

# Local CSV mode
./whois_grabber --csv

# Docker DB mode
docker run --rm -e CASSANDRA_URL=192.168.1.201:9042 -e CASSANDRA_KEYSPACE=domain_discovery whois-newest-worker

# Docker CSV mode (mount for file output)
docker run --rm -v "$(pwd):/app" -e CASSANDRA_URL=192.168.1.201:9042 -e CASSANDRA_KEYSPACE=domain_discovery whois-newest-worker --csv
```

The tool will:
1. Scrape download links from `https://whoisds.com/newly-registered-domains`
2. Download and extract each ZIP archive
3. Insert unique domains into the `domains_processed` table (unless `--csv` mode)
4. Write all domains to `all_downloaded_domains.csv`

## Output
- `all_downloaded_domains.csv`: CSV with a single `Domain` column

## Notes
- Ensure your network allows outbound HTTPS to `whoisds.com`
- Adjust the Go code or Dockerfile for custom needs (e.g., proxy settings)

## Docker Swarm

This image can also run as a service in Docker Swarm after being built and pushed to your registry.

```bash
docker service create --name <service-name> --env-file .env <image>:latest
```

Alternatively include the service in a stack file and deploy with `docker stack deploy`.
