# Blue Frog Analytics Frontend

This directory hosts the next generation website for **Blue Frog Analytics**.
It uses [Astro](https://astro.build) with [Tailwind CSS](https://tailwindcss.com).
Content pages and documentation are written in MDX and leverage components from the BlueFrogAnalytics UI library.

## Getting Started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Create a `.env` file based on `.env.example` with your Firebase credentials.

## Building

Generate the production build:

```bash
npm run build
```

## Docker (optional API server)

If you want to run the profile API service in Docker, build and run:

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

## Automatic Dates

Blog posts and docs do not require manual publish dates. During build, the `applyGitDates` utility reads git history to populate `pubDate` and `updatedDate`.
