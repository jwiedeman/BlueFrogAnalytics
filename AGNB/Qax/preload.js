const { contextBridge, ipcRenderer } = require('electron');
// Preload runs from app root directory; use __dirname to resolve resource folders

contextBridge.exposeInMainWorld('electronAPI', {
  runScenario: (scenarioPath) => ipcRenderer.invoke('run-scenario', scenarioPath),
  onLog: (callback) => ipcRenderer.on('run-log', (event, data) => callback(data)),
  // List scenario definition file names under the scenarios directory
  getScenarios: () => ipcRenderer.invoke('get-scenarios'),
  // Read scenario file content
  getScenarioContent: (fileName) => ipcRenderer.invoke('get-scenario-content', fileName),
  // List run definition files for a given scenario
  getRuns: (scenarioPath) => {
    const fs = require('fs');
    const path = require('path');
    // Normalize scenario name (strip extension if file)
    const base = path.basename(scenarioPath, path.extname(scenarioPath));
    const runsDir = path.join(__dirname, 'runs', base);
    try {
      if (!fs.existsSync(runsDir)) fs.mkdirSync(runsDir, { recursive: true });
      return fs.readdirSync(runsDir)
        .filter(name => /\.(ya?ml|json)$/i.test(name));
    } catch (e) {
      console.error('getRuns error:', e);
      return [];
    }
  },
  // Create a new run file for a given scenario
  createRun: (scenarioPath, runName) => {
    const fs = require('fs');
    const path = require('path');
    const base = path.basename(scenarioPath, path.extname(scenarioPath));
    const runsDir = path.join(__dirname, 'runs', base);
    if (!fs.existsSync(runsDir)) fs.mkdirSync(runsDir, { recursive: true });
    // Ensure valid filename
    const fileName = runName.endsWith('.yaml') || runName.endsWith('.yml') || runName.endsWith('.json')
      ? runName
      : `${runName}.yaml`;
    const fullPath = path.join(runsDir, fileName);
    if (fs.existsSync(fullPath)) throw new Error(`Run already exists: ${fileName}`);
    // Initialize with basic template
    const template = `# Run: ${runName}\nname: ${runName}\nsteps: []\n`;
    fs.writeFileSync(fullPath, template, 'utf8');
    return fileName;
  },
  // Delete a run file
  deleteRun: (scenarioPath, runFile) => {
    const fs = require('fs');
    const path = require('path');
    const base = path.basename(scenarioPath, path.extname(scenarioPath));
    const fullPath = path.join(__dirname, 'runs', base, runFile);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    return true;
  },
  // Open a run file in the default editor
  openRun: (scenarioPath, runFile) => {
    const path = require('path');
    const { shell } = require('electron');
    const base = path.basename(scenarioPath, path.extname(scenarioPath));
    const fullPath = path.join(__dirname, 'runs', base, runFile);
    shell.openPath(fullPath);
    return true;
  },
  // Create a new scenario definition file (returns file name)
  createScenario: (scenarioName) => ipcRenderer.invoke('create-scenario', scenarioName),
  // Delete a scenario definition file
  deleteScenario: (fileName) => ipcRenderer.invoke('delete-scenario', fileName),
  // Open a scenario definition file in the default editor
  openScenario: (fileName) => ipcRenderer.invoke('open-scenario', fileName),
  // Save scenario file (JSON format)
  saveScenario: (fileName, content) => ipcRenderer.invoke('save-scenario', fileName, content),
  // Flow (Playwright-DSL) file management
  getFlows: () => ipcRenderer.invoke('get-flows'),
  openFlow: (fileName) => ipcRenderer.invoke('open-flow', fileName),
  getFlowContent: (fileName) => ipcRenderer.invoke('get-flow-content', fileName),
  saveFlow: (fileName, content) => ipcRenderer.invoke('save-flow', fileName, content),
  createFlow: (flowName) => ipcRenderer.invoke('create-flow', flowName),
  deleteFlow: (fileName) => ipcRenderer.invoke('delete-flow', fileName),
  // Nested listing of past runs (HAR + screenshots)
  getPastRunGroups: () => ipcRenderer.invoke('get-past-run-groups'),
  // Open a screenshot file
  openScreenshot: (group, workerLabel, fileName) => ipcRenderer.invoke('open-screenshot', group, workerLabel, fileName),
  // Get the base logs directory path
  getLogsDir: () => ipcRenderer.invoke('get-logs-dir'),
  // Delete an entire past run group (directory)
  deletePastRunGroup: (group) => ipcRenderer.invoke('delete-past-run-group', group),
  // Multi-run: start multiple workers of a scenario with optional Playwright settings
  startMultiRun: (scenarioPath, count, settings) => ipcRenderer.invoke('start-multi-run', scenarioPath, count, settings),
  // List active runs (workers)
  listActiveRuns: () => ipcRenderer.invoke('list-active-runs'),
  // Cancel a running worker
  cancelRun: (runId) => ipcRenderer.invoke('cancel-run', runId),
  // Subscribe to live per-worker progress logs
  onRunProgress: (callback) => ipcRenderer.on('multi-run-progress', (event, data) => callback(data)),
  // Subscribe to worker completion
  onRunComplete: (callback) => ipcRenderer.on('multi-run-complete', (event, data) => callback(data)),
  // Subscribe to rule engine results for a single-run scenario
  onRuleResults: (callback) => ipcRenderer.on('rule-results', (event, results) => callback(results)),
  // Swarm preset management
  getSwarms: () => ipcRenderer.invoke('get-swarms'),
  getSwarmContent: (fileName) => ipcRenderer.invoke('get-swarm-content', fileName),
  saveSwarm: (fileName, settingsList) => ipcRenderer.invoke('save-swarm', fileName, settingsList),
  deleteSwarm: (fileName) => ipcRenderer.invoke('delete-swarm', fileName),
  // Rule management
  getRules: () => ipcRenderer.invoke('get-rules'),
  getRuleContent: (fileName) => ipcRenderer.invoke('get-rule-content', fileName),
  saveRule: (fileName, content) => ipcRenderer.invoke('save-rule', fileName, content),
  createRule: (ruleName) => ipcRenderer.invoke('create-rule', ruleName),
  deleteRule: (fileName) => ipcRenderer.invoke('delete-rule', fileName),
  openRule: (fileName) => ipcRenderer.invoke('open-rule', fileName),
  // Dimension management
  getDimensions: () => ipcRenderer.invoke('get-dimensions'),
  getDimensionContent: (fileName) => ipcRenderer.invoke('get-dimension-content', fileName),
  saveDimension: (fileName, content) => ipcRenderer.invoke('save-dimension', fileName, content),
  createDimension: (dimName) => ipcRenderer.invoke('create-dimension', dimName),
  deleteDimension: (fileName) => ipcRenderer.invoke('delete-dimension', fileName),
  openDimension: (fileName) => ipcRenderer.invoke('open-dimension', fileName),
  // Evaluate a HAR string through the rule engine
  evaluateHar: (harString) => ipcRenderer.invoke('evaluate-har', harString),
  // List flat HAR files in logs directory
  getPastRuns: () => ipcRenderer.invoke('get-past-runs'),
  // Read HAR file contents
  getHarContent: (fileName) => ipcRenderer.invoke('get-har-content', fileName)
});