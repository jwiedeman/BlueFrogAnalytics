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

## Profile Service

The optional profile service provides an API for storing user profiles in Cassandra.
Start it locally with:

```bash
node server/profileServer.js
```

Environment variables for the service are defined in `.env.example`.
