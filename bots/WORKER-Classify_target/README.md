<!-- markdownlint-disable MD041 MD024 -->
# Site Classifier

## Prerequisites

- Go 1.21+ (for native builds)
- Ollama CLI installed and in your PATH (https://ollama.com/)
- Access to a Cassandra cluster (set CASSANDRA_HOSTS & CASSANDRA_KEYSPACE)

A Go-based classifier that reads unclassified domains from Cassandra, fetches page text, and uses the Ollama CLI to classify site type, category, and tags. Direct single-page CSV classification is not yet implemented.

## Features

- Homepage text extraction with optional crawl mode (crawl not yet implemented)
- Text extraction by stripping HTML tags and cleaning whitespace
- Batch classification via LLM
- Aggregation of page-level labels into a final classification
- Configurable via environment variables
- Optional "hotstage" domains can keep the GPU busy when no new
  sites are available
- Background prefetcher queues up reachable domains so the GPU
  always has work ready
- Docker-ready for containerized deployment
- Uses a rotating list of public DNS servers with 120s timeouts for global sites
- Automatically tries HTTP/HTTPS and www variations concurrently,
  following redirects for faster reachability checks

## Data Flow

1. **Input**: Target site URL (e.g., `https://example.com`).
2. **Crawling** (_crawl mode_):
   - Fetch homepage and follow internal links (up to `--max-pages`).
   - Extract text content from each page.
3. **Direct** (_direct mode_):
   - Fetch only the homepage, no further crawling.
4. **Batch Classification**:
   - Join extracted texts with separators.
   - Construct an LLM prompt and send to the configured backend.
5. **Aggregation**:
   - Parse the JSON array output from the LLM.
   - Fuse page-level labels into a single classification.
6. **Output**:
   - Write a CSV with columns: `url`, `site_type`, `site_category`, `site_type_tags`.

## Native (Cassandra DB) Mode

 The worker maintains a background prefetcher that pulls batches of unclassified domains,
 keeps a backlog of around **500** sites under test, and ensures at least **50**
 ready-to-classify pages are always queued. To run natively:

1. Set environment variables:

   ```bash
   export CASSANDRA_HOSTS="192.168.1.201,192.168.1.202,192.168.1.203"
   export CASSANDRA_KEYSPACE="domain_discovery"
   export OLLAMA_MODEL="llama2:7b"
   # Optional comma-separated list of fallback domains used when
   # no new domains are available
   export HOTSTAGE_DOMAINS="example.com,example.org"
   ```

2. Build and run:

   ```bash
   go build -o site-classifier main.go
   ./site-classifier
   ```

The binary will:
- Connect to Cassandra at the provided hosts.
- Fetch domains needing classification from `domains_processed` where `site_type=''`.
- Prefetch reachable domains in the background to keep a queue filled.
- Fetch page text, call Ollama to classify, and update Cassandra.

Direct single-domain classification (CSV output) is not yet implemented.


## Docker

> **Note:** The Docker image now includes the Ollama CLI (installed via the official script). Classification will work out of the box without additional setup.

Build the Docker image:

```bash
docker build -t site-classifier:latest .
```

Run in Docker (reads the same env vars via `--env-file`).
For larger models (e.g. llama3:8b), ensure the container has sufficient memory. On Docker Desktop, increase the memory limit in Preferences > Resources, or pass `--memory` to `docker run`.

```bash
# Create an .env file as shown above
docker run --rm \
  --memory 12g \
  --env-file .env \
  site-classifier:latest
```

### GPU Acceleration

If you want Ollama to leverage an NVIDIA GPU, pass the `--gpus all` flag when
starting the container:

```bash
docker run --rm \
  --gpus all \
  --memory 12g \
  --env-file .env \
  site-classifier:latest
```

Alternatively, a sample **docker-compose** file is provided to avoid typing the
flag every time:

```yaml
version: '3.8'
services:
  site-classifier:
    build: .
    image: site-classifier:latest
    env_file:
      - .env
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

Run it with:

```bash
docker-compose -f docker-compose.gpu.yml up
```



## Why It Works

This tool leverages an LLM to interpret natural language content across a site, enabling taxonomy classification without bespoke heuristics. Parallel crawling ensures efficient data collection, while batch prompting captures context from multiple pages for robust predictions.