# flow-runner

**flow-runner** is a modular CLI tool built on [Playwright](https://playwright.dev/) that executes headless browser flows defined in YAML. It records HTTP Archive (HAR) files, captures screenshots, and performs network request assertions to help with web monitoring, testing, and performance analysis.

## Table of Contents

- [Features](#features)
- [Architecture & Data Flow](#architecture--data-flow)
- [Flow Definition DSL](#flow-definition-dsl)
- [Installation](#installation)
- [Usage](#usage)
  - [CLI Mode](#cli-mode)
  - [Docker Mode](#docker-mode)
  - [Docker Swarm Mode](#docker-swarm-mode)
- [Options](#options)
- [Output](#output)
- [Logging](#logging)
- [Examples](#examples)
- [License](#license)

## Features

- Execute multi-step browser flows using a simple YAML-based DSL
- Record HAR files (`recordHar`) natively via Playwright contexts
- Capture screenshots of pages or elements
- Assert that specific network requests have occurred
- Support for Chromium, Firefox, and WebKit
- Configurable timeouts, output directories, and logging levels

## Architecture & Data Flow

1. **Load Flow**: Parses a YAML file containing an array of named steps (e.g., `goto`, `click`, `screenshot`).
2. **Initialize Browser**: Launches a headless Playwright browser (Chromium/Firefox/WebKit).
3. **Create Context**: Configures a new context with HAR recording enabled.
4. **Run Steps**: For each step:
   - Sends navigation commands (`page.goto`)
   - Interacts with the page (`click`, `fill`, `waitForSelector`)
   - Takes screenshots (`page.screenshot`)
   - Waits, asserts network requests, etc.
   - All network requests are captured in memory to support `assert_request`.
5. **Network Idle**: Optionally waits up to 5s for `networkidle` to ensure in-flight requests complete.
6. **Cleanup**: Closes the page, context (flushing the HAR), and browser.
7. **Output**: HAR file and screenshots are saved under `output/<flowName>/<timestamp>/`.

## Flow Definition DSL

A flow is a top-level array of steps. Each step is an object with a single key indicating the action, and a value or object for parameters. Supported actions:

| Action              | Parameters                              | Description                                           |
|---------------------|-----------------------------------------|-------------------------------------------------------|
| `goto`              | `<url>`                                 | Navigate to the specified URL.                        |
| `click`             | `<selector>`                            | Click the element matching the selector.              |
| `type`              | `{ selector: <sel>, text: <string> }`   | Fill the input matching `selector` with `text`.       |
| `wait`              | `<seconds>`                             | Sleep for the given number of seconds.                |
| `wait_for_selector` | `<selector>`                            | Wait for the selector to appear in the DOM.           |
| `assert_request`    | `<substring>`                           | Assert a network request URL contains this substring. |
| `screenshot`        | `<filename>`                            | Capture a screenshot saved under output directory.    |

Example:

```yaml
- goto: https://example.com
- wait_for_selector: 'body'
- assert_request: 'example.com'
- screenshot: home.png
```

## Installation

**Prerequisites**: Node.js ≥18, npm ≥8.

```bash
git clone <repo_url>
cd flow-runner
npm install
```

## Usage

### CLI Mode

```bash
# Run a flow
npx flow-runner run flows/<flow>.yaml \
  --browser=chromium \
  --output=output \
  --timeout=120000
```

Or, if installed globally:

```bash
flow-runner run flows/<flow>.yaml --browser=firefox
```

### Docker Mode

A `Dockerfile` is included for containerized execution, based on the official Playwright image:

```dockerfile
# Dockerfile
FROM mcr.microsoft.com/playwright:1.38.0-focal

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Entrypoint wrapper
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Declare mount points
VOLUME ["/app/flows", "/app/output"]

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
```

Build and run:

```bash
docker build -t flow-runner:latest .
docker run --rm \
  -e FLOW=flows/<flow>.yaml \
  -e BROWSER=chromium \
  -e TIMEOUT=120000 \
  -e LOG_LEVEL=info \
  -v "$(pwd)/flows:/app/flows:ro" \
  -v "$(pwd)/output:/app/output" \
  flow-runner:latest
```

### Docker Swarm Mode

Deploy with Docker Swarm using the provided `docker-stack.yml`:

```bash
docker stack deploy -c docker-stack.yml flow-runner-stack
```

The stack will create a replicated service that mounts your host `flows` and `output` directories and uses environment variables (as defined in `docker-stack.yml`) to drive the execution. Update the file with your actual paths and settings.

## Options

| Flag              | Default      | Description                                        |
|-------------------|--------------|----------------------------------------------------|
| `-b, --browser`   | `chromium`   | Browser engine: `chromium`, `firefox`, `webkit`.    |
| `-o, --output`    | `output`     | Base output directory for HAR and screenshots.     |
| `-t, --timeout`   | `120000`     | Navigation and action timeout in milliseconds.     |

## Output

After a run, you will find:

```
output/
└── <flowName>/
    └── YYYY-MM-DDTHH-MM-SS-mmmZ/
        ├── <flowName>.har
        ├── screenshot1.png
        └── ...
```

- **HAR File**: Complete HTTP Archive for the entire session.
- **Screenshots**: As defined by `screenshot` steps in the flow.

## Logging

Uses [Pino](https://getpino.io/) for structured JSON logging. Control log level via `LOG_LEVEL` environment variable (e.g., `DEBUG`, `INFO`, `WARN`, `ERROR`).

Example:

```bash
LOG_LEVEL=debug flow-runner run flows/<flow>.yaml
```

## Examples

See `flows/foxnews.yml` for a sample flow that navigates the Fox News homepage, opinion, and US sections; captures screenshots and asserts network requests.

## License

MIT License. See [LICENSE](LICENSE).
