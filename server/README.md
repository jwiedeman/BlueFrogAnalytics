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

- `FIREBASE_SERVICE_ACCOUNT` – path to your service account JSON
- `CASSANDRA_CONTACT_POINTS` – comma separated list of hosts (default `127.0.0.1`)
- `CASSANDRA_LOCAL_DATA_CENTER` – Cassandra data center name
- `CASSANDRA_KEYSPACE` – keyspace for user profiles
- `PORT` – port to listen on (default `6001`)

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

All API routes, including streaming updates for tools like the Tag Health checker, share the single port defined by `PORT`. Set this variable if you need a different internal port. When exposing the service publicly, forward your chosen external port (typically `443` for HTTPS) to the internal `PORT`. The production site expects the API to be reachable at `https://www.api.bluefroganalytics.com`, so configure your reverse proxy or NAT rules accordingly.
