# QATool-JS

QATool-JS is a cross-platform (Windows/macOS) desktop application built with Electron and Playwright for automating web-based QA tests.

## Features
- Define test scenarios using JSON or YAML files in the `scenarios/` folder
- One-click runs from a native Electron GUI
- Live streaming of each scenario’s log steps
- Generates HAR logs per scenario run, saved under `logs/`

## Prerequisites
- Node.js v16 or higher (includes npm)

## Installation & Setup
```bash
git clone https://github.com/example/qatool-js.git
cd qatool-js
# Install dependencies
npm install
# Install Playwright CLI and browsers with OS dependencies
npm run install-browsers
# Start the Electron application
npm start
```

## Project Structure
- package.json       # app metadata and scripts
- main.js            # Electron main process (creates windows, handles IPC)
- preload.js         # context bridge exposing secure IPC
- runner.js          # Node.js wrapper executing scenarios via Playwright
- renderer/
  - index.html       # GUI layout (sidebar + log viewer)
  - index.js         # Renderer process logic (scenario list, run button, live logs)
- scenarios/         # Place your JSON/YAML test definitions here
- logs/              # Generated HAR and console logs appear here

## Writing Scenarios
Scenarios can be defined in YAML or JSON. Example `scenarios/simple.yaml`:
```yaml
name: simple_visit
steps:
  - name: "Visit landing page 1"
    action: navigate
    url: https://example.com
  - name: "Wait 5 seconds"
    action: wait
    parameters:
      seconds: 5
  - name: "Next page"
    action: navigate
    url: https://example.com/next
```

## Using the App
1. Launch with `npm start`.
2. Select a scenario from the left pane.
3. Click **Run Scenario**.
4. Monitor live steps and status in the log viewer.

## Packaging
Use [electron-builder](https://www.electron.build/) to create installers:
```bash
npx electron-builder --mac --win
```

## License
MIT