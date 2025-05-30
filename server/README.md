# API Server

This directory houses the Express-based API for Blue Frog Analytics. The server provides Firebase authenticated profile management and endpoints for running Lighthouse audits.

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
- `PORT` – port to listen on (default `3001`)

## Docker

Build the image and run it:

```bash
docker build -t profile-service .
docker run -p 3001:3001 \
  -v /path/to/serviceAccount.json:/app/serviceAccount.json:ro \
  -e FIREBASE_SERVICE_ACCOUNT=/app/serviceAccount.json \
  -e CASSANDRA_CONTACT_POINTS=127.0.0.1 \
  -e CASSANDRA_LOCAL_DATA_CENTER=datacenter1 \
  -e CASSANDRA_KEYSPACE=profiles \
  profile-service
```
