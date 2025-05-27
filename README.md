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
Each user's Firebase UID is hashed with SHA-256 before being stored to keep the table
keys non-identifiable. Start it locally with:

```bash
node server/profileServer.js
```

Environment variables for the service are defined in `.env.example`.
The API exposes two routes:

```
POST /api/profile  - Create or update a profile
GET  /api/profile  - Retrieve the current user's profile
```

### Cassandra Setup

Create the `profiles` keyspace and `user_profiles` table before running the profile service:

```sql
CREATE KEYSPACE IF NOT EXISTS profiles WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

CREATE TABLE IF NOT EXISTS profiles.user_profiles (
  uid text PRIMARY KEY,
  name text,
  payment_preference text,
  domains list<text>,
  tests map<text,int>
);
```

The server will connect using the contact points and data center specified in the environment variables.
