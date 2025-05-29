# QA Proxy
See `electron-app/README.md` for detailed setup, certificate handling, and usage of the active implementation.

This tool intercepts and decrypts HTTP/HTTPS traffic for whitelisted domains and applies QA rules on the requests.

## Features
- SSL/TLS interception using mitmproxy
- Whitelist domains only
- Simple rule engine with chainable tests

## Installation
This tool is implemented entirely in JavaScript, with both a CLI mode and an Electron desktop GUI.

## Prerequisites
- Node.js 14+ and npm

## Installation
Clone the repo and install dependencies:
```bash
cd electron-app
npm install
```

## CLI Usage
Initialize the local database (creates default whitelist & rules):
```bash
npm run cli -- --init
```
Start the headless API server and proxy:
```bash
npm run cli -- --headless
```
The API will listen on http://localhost:1995 with endpoints:
- GET  /api/whitelist
- POST /api/whitelist
- GET  /api/rules
- POST /api/rules
- POST /api/start
- POST /api/stop
- GET  /api/status

## Desktop GUI
Launch the Electron app (includes the headless server automatically):
```bash
npm start
```
A native window will open, letting you manage the proxy, whitelist, and rules.

All data is persisted in `src/data/db.json`.

## Usage
1. Add domains to `whitelist.txt`
2. Define rules in `rules.yaml`
3. Run the proxy:
   ```
   mitmproxy -s qa_proxy.py --set whitelist_file=whitelist.txt --set rules_file=rules.yaml
   ```
4. Configure your browser or system to use `localhost:8080` as HTTP/HTTPS proxy.
5. (Optional) Launch the GUI:
   ```
   python gui.py
   ```
   This opens a desktop window for managing whitelist, rules, and starting/stopping the proxy.

## MITM Certificate
On first run, mitmproxy generates a root CA. Install it in your system/browser to avoid TLS warnings.