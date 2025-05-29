# CertStream ETL

This service consumes CertStream websocket feeds and stores the domains in a Cassandra database. It can optionally run the official seed server so everything is self contained.

## Quick start

Build and launch the seed server and listener using Docker Compose. The provided `docker-compose.yml` creates a small network so the two containers can talk to each other.

```bash
docker compose up -d --build
```

The listener exposes `CERTSTREAM_REMOTE_URL` and `CERTSTREAM_LOCAL_URL` if you need to point to alternate endpoints. Cassandra connectivity can be tweaked with `CASSANDRA_URL`.

## Single image option

If you prefer to run both processes inside one container, build the combined image and run it directly:

```bash
docker build -t certstream-combined -f Dockerfile.combined .
docker run --rm certstream-combined
```

The `start.sh` script in the image launches the seed server first and then executes the Go listener.
