# Blue Frog Analytics Site Overview

This document provides a high level tour of the website in `website/` along with the supporting API and bots.

## Tech Stack
- **Astro 5** with MDX for content pages and documentation
- **Bootstrap 5** for styling and components
- **Express API** under `server/` (Node 18+, Firebase Admin, Cassandra, Lighthouse)
- **Firebase Authentication** for login and dashboard
- **Cassandra** via containerized cluster configuration in `database-control/`
- **Bots** in `bots/` for large scale domain intelligence (Rust, Go, Python, Node workers)

## Primary Site Sections
- **Homepage (`/`)** – Landing page from `src/pages/index.astro` pulling content from `src/content/docs/index.mdx`.
- **About (`/about`)** – Overview of mission and background.
- **Services (`/services`)** – Advisory packages and pricing breakdown.
- **Membership (`/membership`)** – Subscription details for ongoing access.
- **Contact (`/contact`)** – Form to reach the team.
- **Discord (`/discord`)** – Invitation to join the community server.
- **Testing & Tools (`/testing`)** – Directory of free utilities (SEO check, performance check, accessibility check, etc.)
- **Promotional Pages** – Special offers:
  - `/birthday`
  - `/educator`
  - `/medical-professionals`
  - `/military-veterans`
  - `/new-business`
- **Support Pages** – Payment options, site feedback and more:
  - `/payment-options`
  - `/site-feedback`
- **Legal Pages** – Privacy policy, terms, refund and sale policies:
  - `/privacy-policy`, `/privacy-choices`
  - `/terms-of-service`, `/terms-of-sale`, `/refund-policy`
- **Client Login & Dashboard** – Protected area requiring Firebase auth:
  - `/login` – Sign in form with Google login support.
  - `/dashboard` – Overview of monitored domains. Sub‑pages include:
    - `/dashboard/domains` – Manage monitored domains
    - `/dashboard/performance` – Run Lighthouse performance audits
    - `/dashboard/seo` – SEO audits
    - `/dashboard/accessibility` – Accessibility audits
    - `/dashboard/qa` – QA features
    - `/dashboard/billing` and `/dashboard/profile` – User profile management
    - `/dashboard/settings` – Preferences
    - `/dashboard/specification/*` – Tracking specification reference

## Documentation (`/docs`)
Content lives in `src/content/docs` and is loaded through `[...slug].astro`. Major categories include:
- **Introduction** – How Blue Frog Analytics works, terminology, use cases
- **Compliance** – GDPR, CCPA, ADA and other policy guides
- **Analytics Platforms** – Guides for GA4, Meta, and more
- **Ad Platforms** – Tips for major advertising networks
- **Website Platforms** – CMS and e‑commerce integrations
- **BlueFrogAnalytics** – Getting started, API reference, community info, case studies
- **Learning** – General tutorials and best practices

## Blog (`/blog`)
Posts live in `src/content/blog` and are surfaced through `src/pages/blog`. The index page lists posts with search and tag filters. Individual articles render via `blog/[slug].astro`. Posts cover analytics, SEO, compliance and performance topics. Build scripts automatically add publish/update dates from git history.

## Public Assets
All static files such as JavaScript utilities and styles live under `public/` and `src/assets`. Global layout components reside in `src/components`.

## API Server
The Express server at `server/apiServer.js` exposes endpoints for user profile management and running Lighthouse audits. It relies on Firebase service account credentials and a Cassandra backend.

## Bots & Workers
The `bots/` directory holds standalone services for domain reconnaissance, enrichment and classification. Each subfolder contains its own README with build steps.

