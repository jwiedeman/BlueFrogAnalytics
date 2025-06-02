# API Server

This directory houses the Express-based API for Blue Frog Analytics. The server provides Firebase authenticated profile management and endpoints for running Lighthouse audits.

## Endpoints
- `GET /api/profile` – retrieve the authenticated user profile
- `POST /api/profile` – update profile fields
- `POST /api/performance` – run a Lighthouse performance test
- `POST /api/audit/accessibility` – run an accessibility audit
- `POST /api/seo-audit` – run an SEO audit
- `POST /api/tools/*` – various utility endpoints (image conversion, carbon calc, etc.)
- `POST /api/tag-health` – start the analytics tag health scanner
- `GET /api/tag-health/stream` – live scan progress via Server-Sent Events

## Requirements

- Node.js 18+
- A Firebase service account JSON file
- Cassandra contact points and keyspace

## Running locally

Install dependencies and start the server:

```bash
npm install
npm start
```

Environment variables:

- `FIREBASE_SERVICE_ACCOUNT` – path to your service account JSON (defaults to `./serviceAccount.json` if not set)
- `CASSANDRA_CONTACT_POINTS` – comma separated list of hosts (default `127.0.0.1`)
- `CASSANDRA_LOCAL_DATA_CENTER` – Cassandra data center name (must match your
  cluster, default `datacenter1`)
- `CASSANDRA_KEYSPACE` – keyspace for user profiles
- `PORT` – port to listen on (default `6001`)
- `SSL_CERT` – path to TLS certificate (optional)
- `SSL_KEY` – path to TLS private key (optional)
If these are not set, the server automatically generates a temporary self-signed certificate at startup.

You can place these variables in a `.env` file inside the `server` directory.
The server automatically loads this file when starting.

## Docker

Build the image and run it:

```bash
docker build -t profile-service .
docker run -p 6001:6001 \
  -v /path/to/serviceAccount.json:/app/serviceAccount.json:ro \
  -e FIREBASE_SERVICE_ACCOUNT=/app/serviceAccount.json \
  -e CASSANDRA_CONTACT_POINTS=127.0.0.1 \
  -e CASSANDRA_LOCAL_DATA_CENTER=datacenter1 \
  -e CASSANDRA_KEYSPACE=profiles \
  profile-service
```

## Networking

All API routes, including streaming updates for tools like the Tag Health checker, share the single port defined by `PORT`. If `SSL_CERT` and `SSL_KEY` are provided they are used for HTTPS. Otherwise the server generates a temporary self-signed certificate. In production you may terminate TLS in a reverse proxy and forward requests (typically on `443`) to the internal `PORT`. The production site expects the API to be reachable at `https://www.api.bluefroganalytics.com`, so configure your networking accordingly.

### HTTPS with Let's Encrypt

To avoid browser warnings when connecting to the API, run it behind a reverse proxy that handles TLS. A simple option is [Nginx](https://nginx.org/) together with [Certbot](https://certbot.eff.org/) for automatic Let's Encrypt certificates.

1. Install `nginx` and `certbot` on your server.
2. Copy `nginx-https-example.conf` from this directory to `/etc/nginx/sites-available/api.bluefroganalytics.com` and adjust the domain if needed.
3. Enable the config and request a certificate:

```bash
sudo ln -s /etc/nginx/sites-available/api.bluefroganalytics.com /etc/nginx/sites-enabled/
sudo certbot --nginx -d api.bluefroganalytics.com
```

The proxy forwards HTTPS traffic on port 443 to the Node.js server on port `6001`. See the example config for reference.
