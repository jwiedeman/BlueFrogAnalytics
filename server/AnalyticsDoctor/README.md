# Analytics Doctor

This project provides a simple frontend and backend service for scanning a website for common analytics libraries. It is a work in progress and currently detects Google Analytics, Google Tag Manager, Segment, Meta Pixel, Bing, Adobe Analytics, Mixpanel, Hotjar and Amplitude scripts.

## Structure

- `frontend/` – A minimal static webpage that submits a domain and desired page limit to the backend and displays the JSON response.
- `backend-js/` – A Node.js backend that uses Puppeteer to crawl pages with a real headless browser and detect analytics libraries.


## Running the Node.js Backend

For a backend written in JavaScript using Puppeteer, use the `backend-js` folder:

```
cd backend-js
npm install
npm start
```


The backend uses **Express** with the `cors` middleware so requests from any origin are allowed by default.

The Node.js implementation relies on **Puppeteer** to load pages in a real headless browser while scanning a configurable number of pages (default 50, up to 250) per site.

## API Response

The `/scan` endpoint returns JSON describing the analytics detected. The object
has these fields:

- `working_variants` – which domain variants responded successfully
- `variant_results` – for each http/https and www/non-www variant, the status
  code, final URL and full redirect chain

- `scanned_urls` – every page that was crawled
- `found_analytics` – aggregated analytics IDs and detection methods
- `page_results` – mapping of each scanned URL to the analytics found on that
  page

## Running with Docker

To ensure the backend uses a compatible Node.js version, you can build a Docker image.

```
docker build -t analytics-doctor-backend .
docker run -p 5005:5005 analytics-doctor-backend

```

The Dockerfile installs the system `chromium` package and sets
`PUPPETEER_EXECUTABLE_PATH` so Puppeteer launches the correct browser.
This avoids architecture issues (for example when building on Apple Silicon)
and ensures scans run reliably.


## Live progress updates

The backend exposes `/scan-stream` which streams progress updates using
**Server-Sent Events**. The frontend listens to this endpoint so each scanned
page is reported in real time. When the scan finishes, the full summary is
sent and the connection closes.



## Exposing with ngrok

You can expose the local backend using **ngrok** so that the frontend can reach the API from the web:

```
ngrok http 5005
```

Take the HTTPS URL provided by ngrok and update `frontend/script.js` to use that endpoint instead of `http://localhost:5005`.
Set the `API_BASE_URL` constant in `frontend/script.js` to the public URL of the backend, for example the HTTPS address provided by ngrok.


When deploying the frontend (e.g. on Vercel), commit this change so the static
site points to the correct backend URL. The backend allows requests from any
origin by default thanks to the `cors` middleware, so no additional configuration is required.

## Serving the Frontend

The frontend is static so it can be hosted on any web server. During development you can simply open `frontend/index.html` in your browser.

### Deploying on Vercel

1. Fork or clone this repository to your own GitHub account.
2. Edit `frontend/script.js` and set `API_BASE_URL` to the HTTPS address from
   ngrok.
3. Commit and push the change. Every push will trigger a new Vercel deployment
   if you have connected the repository to Vercel.
4. Start your backend locally and run `ngrok http 5005` each time. Update the
   constant whenever the ngrok URL changes and redeploy the frontend.

## Disclaimer

This code is a minimal proof of concept and does not handle advanced scenarios like network request interception or automating user interactions. Further development would be required to fully meet all features described in the project goals.
