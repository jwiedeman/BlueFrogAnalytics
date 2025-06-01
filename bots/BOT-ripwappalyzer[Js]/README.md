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

## Docker Swarm

This image can also run as a service in Docker Swarm after being built and pushed to your registry.

```bash
docker service create --name <service-name> --env-file .env <image>:latest
```

Alternatively include the service in a stack file and deploy with `docker stack deploy`.
