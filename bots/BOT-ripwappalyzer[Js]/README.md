# ripwappalyzer (Node.js)

Simple technology fingerprinting utility built with Puppeteer and Wappalyzer.
It visits a target URL, collects headers, cookies, SSL info and network requests,
then logs the detected technologies to `scan_log.txt`.

## Usage
```bash
npm install
node index.js https://example.com
```

Requires Node.js 18+.
