# WebPageTest Crawler

> This project crawls a given domain, generates a sitemap, runs WebPageTest tests via HTTP API on each page, and outputs the results.

## Features
- Crawl entire site and discover URLs
- Save sitemap as CSV
- Run WebPageTest CLI on each URL (JSON output)
- Save aggregated results to JSON file
- Stub for Cassandra integration
- Dockerized for easy use

## Requirements
  - Docker (if running in Docker)
  - Or, Node.js >=18 and npm

## Installation
### Local Setup
Ensure you have a WebPageTest server running locally (e.g., your private instance at http://localhost).
```bash
git clone <repo-url>
cd <repo-directory>
npm install
```

### Docker
```bash
docker build -t wpt-crawler .
```

## Usage
### Local
```bash
node index.js --domain example.com --saveSitemap --outputDir ./output
```

### Docker
```bash
docker run --rm -v $(pwd)/output:/app/output wpt-crawler --domain example.com --saveSitemap --outputDir /app/output
```

## Options
| Option       | Description                                              |
| ------------ | -------------------------------------------------------- |
| --domain     | Domain to crawl (e.g., example.com) **(required)**       |
| --maxDepth   | Max crawl depth (0 = unlimited)                         |
| --saveSitemap| Save sitemap as CSV                                      |
| --outputDir  | Output directory for results                             |
| --cassandra  | Send results to Cassandra (stub)                         |
| --wptServer  | WebPageTest server URL (default: http://localhost)        |
| --wptKey     | WebPageTest API key (if required by server)              |

## Cassandra Integration
The `cassandra.js` is a stub. Implement `init` and `send` to integrate with Apache Cassandra.