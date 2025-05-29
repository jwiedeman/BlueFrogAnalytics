# QA Proxy Desktop App

This Electron-based application provides both a graphical interface and a command-line interface for intercepting, decrypting, and QA-processing HTTP/HTTPS traffic for whitelisted domains.

## Features
- SSL/TLS interception for whitelisted domains
- Rule engine for evaluating requests against custom QA rules
- Raw and processed flow inspection
- Session management and export

## Prerequisites
- Node.js v14 or higher

## Installation
```bash
cd electron-app
npm install
```
The `postinstall` script will initialize the default database configuration automatically.

## Running the Application

### GUI Mode
Launch the desktop GUI:
```bash
npm start
```
- This will:
- Generate a root CA and host certificates under the Electron data directory (see Certificates and Trust below)
- Start the QA MITM proxy (default port 8080)
- Open the main window for managing whitelist, rules, and sessions

### CLI Mode
Run the headless API server and proxy (certificates stored in `~/.qa-proxy/ca`):
```bash
npm run cli -- --headless --port <API_PORT>
```
Default API port: 50000

#### Available API Endpoints
- GET  /api/whitelist          # List whitelisted domains
- POST /api/whitelist          # Replace whitelist (array of domains)
- GET  /api/rules              # List QA rules
- POST /api/rules              # Replace rules (JSON { rules: [...] })
- POST /api/start              # Start proxy
- POST /api/stop               # Stop proxy
- GET  /api/status             # Check proxy running state
- GET  /api/flows              # Get raw request flows
- POST /api/flows/clear        # Clear raw flows
- GET  /api/processed          # Get processed (rule-evaluated) flows
- POST /api/processed/clear   # Clear processed flows
- GET  /api/sessions           # List saved sessions
- GET  /api/sessions/:id       # Retrieve session by ID
- POST /api/sessions/:id/export # Export session data

## Proxy Behavior
- Whitelisted domains are MITM-intercepted; certificates are dynamically generated.
- Non-whitelisted domains are tunneled directly without inspection.

## Certificates and Trust
On first run, a root CA and per-host certificates are generated under your Electron data path:

- macOS: `~/Library/Application Support/<AppName>/ca`
- Windows: `%APPDATA%\<AppName>\ca`
- Linux: `~/.config/<AppName>/ca`

Directory contents (relative to `<ElectronData>/ca`):
- `certs/ca.pem`           – Root CA certificate
- `keys/ca.private.key`   – Root CA private key
- `certs/<hostname>.pem`  – Generated host certificate for each whitelisted domain
- `keys/<hostname>.key`   – Host private key

To avoid TLS errors in your browser or system, import **ca/certs/ca.pem** into your OS/browser trust store:

- **macOS**: Keychain Access → System → File → Import → set to “Always Trust”
- **Windows**: Run `certmgr.msc` → Trusted Root Certification Authorities → Import
- **Ubuntu/Debian**: `sudo cp ca/certs/ca.pem /usr/local/share/ca-certificates/qa-proxy-desktop.crt && sudo update-ca-certificates`

## Whitelist & Rules Management
Manage domains and rules using the GUI or the API endpoints listed above. Only whitelisted domains will be inspected; all others are passed through.

## Cleanup of Old Artifacts
If you have leftover certificate directories from previous versions, run the cleanup script at the project root:
```bash
./cleanup-artifacts.sh
```

## Configuration Storage
The whitelist and rules are stored in a lightweight SQLite database file:

  `<userData>/qa_proxy.sqlite3`

You can find the full path printed in the console when the app starts:

  `Using SSL CA directory: ...`  
  `Database path: <userData>/qa_proxy.sqlite3`

## Contributing
Pull requests are welcome! Please open issues for bugs or feature requests.