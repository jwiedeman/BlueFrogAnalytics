# Playwright Flow Runner

Minimal CLI to run DSL flows with Playwright (records network activity as HAR).

## Installation

Install dependencies:
```
npm install
npx playwright install
```
Note: On macOS, you may encounter permissions errors when Playwright tries to create temporary directories under `/var/folders/.../playwright-artifacts-...`. If so, clear or fix permissions:
```bash
# remove old Playwright temp dirs (adjust path as needed)
rm -rf /var/folders/*/*/*/playwright-artifacts-*
# or reset permissions
sudo chown -R $(id -u):$(id -g) /var/folders
```

## Usage

```
flow-runner run <flow.yml> [options]
```

Options:
- `-b, --browser <browser>`       Browser to use (`chromium`|`firefox`|`webkit`) (default: `chromium`)
- `-o, --output <dir>`            Output directory for artifacts (default: `output`)
- `-V, --version`                 output the version number
- `-h, --help`                    display help for command

Example:
```
flow-runner run flows/foxnews.yml
```
Note: By default, Playwright's navigation and action timeouts have been increased to 240 seconds (240000 ms) to accommodate slower-loading pages.
By default, each execution creates a unique subfolder under the output directory in the format:
```
<output_root>/<domain>/<flow_name>/<timestamp>/
```
All CLI artifacts (HAR file, screenshots, etc.) will be placed within that run-specific folder.

Note: To avoid permission issues when Playwright creates temporary user data directories, flow-runner automatically sets `TMPDIR` to a subfolder of the run directory (`tmp/`).

## Flow DSL

The flow YAML file should be an array of steps. Each step is a mapping with a single key:

- `goto`: URL to navigate
- `click`: CSS selector to click
- `type`:
  - `selector`: CSS selector
  - `text`: text to type
- `wait`: number of seconds to wait
- `wait_for_selector`: CSS selector to wait for
- `assert_request`: substring to match request URL
- `screenshot`: filename for screenshot

Example flow (`flows/foxnews.yml`):
```yaml
- goto: https://foxnews.com
- wait_for_selector: 'body'
- screenshot: page.png
- assert_request: 'foxnews.com'
```

## Requirements

- Node.js >= 14
- Playwright installed:
  ```bash
  npm install
  npx playwright install
  ```