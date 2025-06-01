# Analytics Doctor Backend

The Analytics Doctor backend (now used for the **Analytics Tag Health Checker**) scans a website for common analytics libraries such as Google Analytics, Google Tag Manager, Segment, Meta Pixel and more. The static frontend previously included in this folder has been removed because the health checker UI lives in the main website.

## Running Stand-alone

```bash
cd backend-js
npm install
npm start
```

The service exposes two endpoints:

- `POST /scan` – perform a scan and return a JSON summary.
- `GET  /scan-stream` – stream progress updates using Server-Sent Events.

When running inside the main API server these endpoints are mounted under `/api/tag-health` and protected by Firebase authentication.
