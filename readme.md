# Blue Frog Analytics Docs

This repository hosts the documentation site for **Blue Frog Analytics**. It is built with [Astro](https://astro.build) and styled using [Bootstrap&nbsp;5](https://getbootstrap.com). All site fonts follow the typography recommendations from NASA's 1976 Graphics Standard Manual, using Helvetica throughout.

## Getting Started

Install dependencies and start the local development server:

```bash
npm install
npm run dev
```

Create a `.env` file based on `.env.example` and add your Firebase project
credentials before running the dev server. For production builds, copy
`.env.production.example` to `.env.production` and supply the production
Firebase credentials.

## Building

Generate the production build:

```bash
npm run build
```

Documentation content lives in `src/content/docs` and static assets live in `public`.

## Docker

The profile API service can be run in a Docker container. Build the image:

```bash
docker build -t profile-service .
```

Run the container and expose port 3001. Mount your Firebase service account JSON so the server can read it:

```bash
docker run -p 3001:3001 \
  -v /path/to/serviceAccount.json:/app/serviceAccount.json:ro \
  -e FIREBASE_SERVICE_ACCOUNT=/app/serviceAccount.json \
  -e CASSANDRA_CONTACT_POINTS=127.0.0.1 \
  -e CASSANDRA_LOCAL_DATA_CENTER=datacenter1 \
  -e CASSANDRA_KEYSPACE=profiles \
  profile-service
```

Provide environment variables for your Firebase service account and Cassandra configuration. The server listens on port `3001`.
