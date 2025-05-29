const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false
    }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);

// Helper to determine logs directory: use project logs in development, userData logs in production
function getLogsDir() {
  return app.isPackaged
    ? path.join(app.getPath('userData'), 'logs')
    : path.join(__dirname, 'logs');
}

ipcMain.handle('run-scenario', async (event, scenarioPath) => {
  return new Promise((resolve) => {
    // Fork a Node process to run the scenario
    // Resolve absolute path for the scenario file
    const fullPath = path.isAbsolute(scenarioPath)
      ? scenarioPath
      : path.join(__dirname, scenarioPath);
    // Prepare logs directory
    const logsDir = getLogsDir();
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    const runner = fork(
      path.join(__dirname, 'runner.js'),
      [fullPath, logsDir],
      { silent: true }
    );
    runner.stdout.on('data', data => event.sender.send('run-log', data.toString()));
    runner.stderr.on('data', data => event.sender.send('run-log', data.toString()));
    // Relay rule results from runner via IPC
    runner.on('message', msg => {
      if (msg && msg.type === 'ruleResults') {
        event.sender.send('rule-results', msg.results);
      }
    });
    runner.on('exit', code => resolve({ code }));
  });
});

// Evaluate a HAR string through the rule engine

// Scenario file management handlers
ipcMain.handle('get-scenarios', async () => {
  const dir = path.join(app.getAppPath(), 'scenarios');
  try {
    await fs.promises.access(dir);
  } catch {
    return [];
  }
  const entries = await fs.promises.readdir(dir);
  return entries.filter(name => {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    return stat.isFile() && /\.(ya?ml|json)$/i.test(name);
  });
});
// Flow (Playwright-DSL) management handlers
ipcMain.handle('get-flows', async () => {
  const dir = path.join(app.getAppPath(), 'flows');
  try {
    await fs.promises.access(dir);
  } catch {
    return [];
  }
  const entries = await fs.promises.readdir(dir);
  return entries.filter(name => /\.(ya?ml|yml|json)$/i.test(name));
});
ipcMain.handle('open-flow', (event, fileName) => {
  const fullPath = path.join(app.getAppPath(), 'flows', fileName);
  shell.openPath(fullPath);
  return true;
});
ipcMain.handle('get-flow-content', async (event, fileName) => {
  const dir = path.join(app.getAppPath(), 'flows');
  const fullPath = path.join(dir, fileName);
  try {
    await fs.promises.access(fullPath);
    return fs.promises.readFile(fullPath, 'utf8');
  } catch {
    return '';
  }
});
ipcMain.handle('save-flow', async (event, fileName, content) => {
  const dir = path.join(app.getAppPath(), 'flows');
  await fs.promises.mkdir(dir, { recursive: true });
  const fullPath = path.join(dir, fileName);
  await fs.promises.writeFile(fullPath, content, 'utf8');
  return true;
});
ipcMain.handle('create-flow', async (event, flowName) => {
  const dir = path.join(app.getAppPath(), 'flows');
  await fs.promises.mkdir(dir, { recursive: true });
  if (!flowName || !flowName.trim()) throw new Error('Invalid flow name');
  const base = flowName.trim();
  const file = /\.(ya?ml|json)$/i.test(base) ? base : `${base}.yaml`;
  const fullPath = path.join(dir, file);
  if (fs.existsSync(fullPath)) throw new Error(`Flow already exists: ${file}`);
  // Initialize empty flow DSL array
  const template = `[]\n`;
  await fs.promises.writeFile(fullPath, template, 'utf8');
  return file;
});
ipcMain.handle('delete-flow', async (event, fileName) => {
  const fullPath = path.join(app.getAppPath(), 'flows', fileName);
  try { await fs.promises.unlink(fullPath); } catch {}
  return true;
});
ipcMain.handle('create-scenario', async (event, scenarioName) => {
  const dir = path.join(app.getAppPath(), 'scenarios');
  await fs.promises.mkdir(dir, { recursive: true });
  if (!scenarioName || !scenarioName.trim()) {
    throw new Error('Invalid scenario name');
  }
  const name = scenarioName.trim();
  const fileName = /\.(ya?ml|json)$/i.test(name) ? name : `${name}.yaml`;
  const fullPath = path.join(dir, fileName);
  if (fs.existsSync(fullPath)) throw new Error(`Scenario already exists: ${fileName}`);
  const baseName = name.replace(/\.(ya?ml|json)$/i, '');
  const template = `name: ${baseName}\nsteps: []\n`;
  await fs.promises.writeFile(fullPath, template, 'utf8');
  return fileName;
});
ipcMain.handle('delete-scenario', async (event, fileName) => {
  const fullPath = path.join(app.getAppPath(), 'scenarios', fileName);
  try {
    await fs.promises.unlink(fullPath);
  } catch {
    // ignore
  }
  return true;
});
ipcMain.handle('open-scenario', (event, fileName) => {
  const fullPath = path.join(app.getAppPath(), 'scenarios', fileName);
  shell.openPath(fullPath);
  return true;
});
// Read scenario file content
ipcMain.handle('get-scenario-content', async (event, fileName) => {
  const dir = path.join(app.getAppPath(), 'scenarios');
  const fullPath = path.join(dir, fileName);
  try {
    await fs.promises.access(fullPath);
    return fs.promises.readFile(fullPath, 'utf8');
  } catch {
    return '';
  }
});
// Save scenario file (overwrite or create JSON)
ipcMain.handle('save-scenario', async (event, fileName, content) => {
  const dir = path.join(app.getAppPath(), 'scenarios');
  await fs.promises.mkdir(dir, { recursive: true });
  const fullPath = path.join(dir, fileName);
  await fs.promises.writeFile(fullPath, content, 'utf8');
  return true;
});
// List past HAR capture files
ipcMain.handle('get-past-runs', async () => {
  const logsDir = getLogsDir();
  try {
    await fs.promises.access(logsDir);
  } catch {
    return [];
  }
  // Recursively find .har files under logsDir
  const results = [];
  async function walk(dir, prefix = '') {
    const items = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const item of items) {
      const relPath = path.join(prefix, item.name);
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        await walk(fullPath, relPath);
      } else if (item.isFile() && item.name.toLowerCase().endsWith('.har')) {
        results.push(relPath);
      }
    }
  }
  await walk(logsDir);
  return results;
});
// Open HAR file location in file explorer
ipcMain.handle('open-past-run', (event, fileName) => {
  const logsDir = getLogsDir();
  const fullPath = path.join(logsDir, fileName);
  shell.showItemInFolder(fullPath);
  return true;
});
// Read HAR file contents
ipcMain.handle('get-har-content', async (event, fileName) => {
  const logsDir = getLogsDir();
  const fullPath = path.join(logsDir, fileName);
  return fs.promises.readFile(fullPath, 'utf8');
});
// Provide detailed listing of past runs (group dirs with worker subfolders)
ipcMain.handle('get-past-run-groups', async () => {
  const logsDir = getLogsDir();
  try {
    const groups = [];
    const entries = await fs.promises.readdir(logsDir);
    for (const group of entries) {
      // Only include our run groups named with a numeric timestamp suffix
      if (!/-\d+$/.test(group)) continue;
      const groupPath = path.join(logsDir, group);
      const stat = await fs.promises.stat(groupPath);
      if (!stat.isDirectory()) continue;
      const workers = [];
      const subs = await fs.promises.readdir(groupPath);
      for (const sub of subs) {
        const subPath = path.join(groupPath, sub);
        const sstat = await fs.promises.stat(subPath);
        if (!sstat.isDirectory()) continue;
        const files = await fs.promises.readdir(subPath);
        const har = files.find(f => f.toLowerCase().endsWith('.har'));
        const screenshots = files.filter(f => f.toLowerCase().endsWith('.png'));
        workers.push({ label: sub, har, screenshots, path: subPath });
      }
      if (workers.length) groups.push({ group, workers, path: groupPath });
    }
    return groups;
  } catch (e) {
    console.error('Error listing past run groups:', e);
    return [];
  }
});
// Open a screenshot file
ipcMain.handle('open-screenshot', async (event, group, workerLabel, fileName) => {
  try {
    const fullPath = path.join(getLogsDir(), group, workerLabel, fileName);
    await shell.openPath(fullPath);
    return true;
  } catch (e) {
    console.error('Error opening screenshot:', e);
    return false;
  }
});
// Delete a past HAR file
ipcMain.handle('delete-past-run', async (event, fileName) => {
  const logsDir = getLogsDir();
  const fullPath = path.join(logsDir, fileName);
  try {
    await fs.promises.unlink(fullPath);
    return true;
  } catch {
    return false;
  }
});
// Delete an entire past run group (folder and its artifacts)
ipcMain.handle('delete-past-run-group', async (event, group) => {
  const logsDir = getLogsDir();
  const fullPath = path.join(logsDir, group);
  try {
    // Remove directory and all contents
    await fs.promises.rm(fullPath, { recursive: true, force: true });
    return true;
  } catch (e) {
    console.error('Error deleting run group:', e);
    return false;
  }
});
// Rule management handlers
ipcMain.handle('get-rules', async () => {
  const dir = path.join(app.getAppPath(), 'rules');
  try { await fs.promises.access(dir); } catch { return []; }
  const entries = await fs.promises.readdir(dir);
  return entries.filter(n => /\.(ya?ml|json)$/i.test(n));
});
ipcMain.handle('get-rule-content', async (event, fileName) => {
  const full = path.join(app.getAppPath(), 'rules', fileName);
  try { await fs.promises.access(full); return fs.promises.readFile(full, 'utf8'); } catch { return ''; }
});
ipcMain.handle('save-rule', async (event, fileName, content) => {
  const dir = path.join(app.getAppPath(), 'rules'); await fs.promises.mkdir(dir, { recursive: true });
  const full = path.join(dir, fileName);
  await fs.promises.writeFile(full, content, 'utf8'); return true;
});
ipcMain.handle('create-rule', async (event, ruleName) => {
  if (!ruleName || !ruleName.trim()) throw new Error('Invalid rule name');
  const dir = path.join(app.getAppPath(), 'rules'); await fs.promises.mkdir(dir, { recursive: true });
  const file = /\.(ya?ml|json)$/i.test(ruleName) ? ruleName : `${ruleName}.yaml`;
  const full = path.join(dir, file);
  if (fs.existsSync(full)) throw new Error(`Rule already exists: ${file}`);
  // Basic rule template
  const template = `id: ${ruleName}\ndomain: \nmethod: \npath: \nconditions: []\ndependencies: []\n`;
  await fs.promises.writeFile(full, template, 'utf8');
  return file;
});
ipcMain.handle('delete-rule', async (event, fileName) => {
  const full = path.join(app.getAppPath(), 'rules', fileName);
  try { await fs.promises.unlink(full); } catch {} return true;
});
// Dimension management handlers
ipcMain.handle('get-dimensions', async () => {
  const dir = path.join(app.getAppPath(), 'dimensions');
  try { await fs.promises.access(dir); } catch { return []; }
  const entries = await fs.promises.readdir(dir);
  return entries.filter(n => /\.(ya?ml|json)$/i.test(n));
});
ipcMain.handle('get-dimension-content', async (event, fileName) => {
  const full = path.join(app.getAppPath(), 'dimensions', fileName);
  try { await fs.promises.access(full); return fs.promises.readFile(full, 'utf8'); } catch { return ''; }
});
ipcMain.handle('save-dimension', async (event, fileName, content) => {
  const dir = path.join(app.getAppPath(), 'dimensions'); await fs.promises.mkdir(dir, { recursive: true });
  const full = path.join(dir, fileName);
  await fs.promises.writeFile(full, content, 'utf8'); return true;
});
ipcMain.handle('create-dimension', async (event, dimName) => {
  if (!dimName || !dimName.trim()) throw new Error('Invalid dimension name');
  const dir = path.join(app.getAppPath(), 'dimensions'); await fs.promises.mkdir(dir, { recursive: true });
  // Always create JSON file for new dimensions
  const file = /\.(ya?ml|json)$/i.test(dimName)
    ? (dimName.toLowerCase().endsWith('.yaml')
        ? dimName.replace(/\.(ya?ml)$/i, '.json')
        : dimName)
    : `${dimName}.json`;
  const full = path.join(dir, file);
  if (fs.existsSync(full)) throw new Error(`Dimension already exists: ${file}`);
  // Basic dimension JSON template
  const templateObj = {
    key: dimName,
    description: '',
    operator: 'equals',
    expected: '',
    pass_msg: '',
    fail_msg: ''
  };
  const template = JSON.stringify(templateObj, null, 2) + '\n';
  await fs.promises.writeFile(full, template, 'utf8');
  return file;
});
ipcMain.handle('delete-dimension', async (event, fileName) => {
  const full = path.join(app.getAppPath(), 'dimensions', fileName);
  try { await fs.promises.unlink(full); } catch {} return true;
});
// Open rule file in default editor
ipcMain.handle('open-rule', (event, fileName) => {
  const full = path.join(app.getAppPath(), 'rules', fileName);
  shell.openPath(full);
  return true;
});
// Open dimension file in default editor
ipcMain.handle('open-dimension', (event, fileName) => {
  const full = path.join(app.getAppPath(), 'dimensions', fileName);
  shell.openPath(full);
  return true;
});

// Swarm presets storage and management
// Determine directory for storing swarm presets
function getSwarmsDir() {
  return app.isPackaged
    ? path.join(app.getPath('userData'), 'swarms')
    : path.join(__dirname, 'swarms');
}
// List saved swarm preset names (.json files)
ipcMain.handle('get-swarms', async () => {
  const dir = getSwarmsDir();
  try {
    await fs.promises.mkdir(dir, { recursive: true });
    const files = await fs.promises.readdir(dir);
    return files.filter(name => name.toLowerCase().endsWith('.json'));
  } catch (e) {
    console.error('Error listing swarms:', e);
    return [];
  }
});
// Get content of a specific swarm preset (returns JSON string)
ipcMain.handle('get-swarm-content', async (event, fileName) => {
  const dir = getSwarmsDir();
  const fullPath = path.join(dir, fileName);
  try {
    const content = await fs.promises.readFile(fullPath, 'utf8');
    return content;
  } catch (e) {
    console.error('Error reading swarm content:', e);
    return '[]';
  }
});
// Save or overwrite a swarm preset (settingsList is array of worker settings)
ipcMain.handle('save-swarm', async (event, fileName, settingsList) => {
  const dir = getSwarmsDir();
  try {
    await fs.promises.mkdir(dir, { recursive: true });
    const fullPath = path.join(dir, fileName);
    const content = JSON.stringify(settingsList, null, 2);
    await fs.promises.writeFile(fullPath, content, 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving swarm:', e);
    throw e;
  }
});
// Delete a swarm preset
ipcMain.handle('delete-swarm', async (event, fileName) => {
  const dir = getSwarmsDir();
  const fullPath = path.join(dir, fileName);
  try {
    await fs.promises.unlink(fullPath);
    return true;
  } catch (e) {
    console.error('Error deleting swarm:', e);
    return false;
  }
});

// Multi-run worker tracking
const activeRuns = new Map(); // runId -> { cp, scenarioPath, startTime, status }
let nextRunId = 1;

// Start multiple workers for a scenario
// Start multiple workers for a scenario (supports optional Playwright settings)
ipcMain.handle('start-multi-run', (event, scenarioPath, count, settingsList) => {
  const dir = path.isAbsolute(scenarioPath)
    ? scenarioPath
    : path.join(__dirname, scenarioPath);
  const logsDir = getLogsDir();
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  const runIds = [];
  // Shared group timestamp for grouping HAR files
  const groupTs = Date.now();
  for (let i = 0; i < count; i++) {
    const runId = `run-${nextRunId++}`;
    // Prepare runner arguments: scenario path, logs dir, group timestamp, worker index
    const runnerArgs = [dir, logsDir, groupTs, i];
    // Determine per-worker settings: list or single object
    let workerSettings = {};
    if (Array.isArray(settingsList)) {
      workerSettings = settingsList[i] || {};
    } else if (settingsList !== undefined) {
      workerSettings = settingsList;
    }
    // Pass settings JSON to runner
    runnerArgs.push(JSON.stringify(workerSettings));
    const cp = fork(path.join(__dirname, 'runner.js'), runnerArgs, { silent: true });
    activeRuns.set(runId, { cp, scenarioPath, startTime: Date.now(), status: 'running' });
    cp.stdout.on('data', data => event.sender.send('multi-run-progress', { runId, data: data.toString() }));
    cp.stderr.on('data', data => event.sender.send('multi-run-progress', { runId, data: data.toString() }));
    cp.on('exit', code => {
      const info = activeRuns.get(runId);
      if (info) info.status = code === 0 ? 'completed' : 'failed';
      event.sender.send('multi-run-complete', { runId, code });
    });
    runIds.push(runId);
  }
  return runIds;
});

// List currently active runs (including completed)
ipcMain.handle('list-active-runs', () => {
  const list = [];
  for (const [runId, info] of activeRuns.entries()) {
    list.push({ runId, scenarioPath: info.scenarioPath, startTime: info.startTime, status: info.status });
  }
  return list;
});

// Cancel a running worker
ipcMain.handle('cancel-run', (event, runId) => {
  const info = activeRuns.get(runId);
  if (info && info.cp) {
    info.cp.kill();
    info.status = 'cancelled';
    return true;
  }
  return false;
});
// Provide logs directory path to renderer
ipcMain.handle('get-logs-dir', () => {
  return getLogsDir();
});
// Evaluate a HAR string against the rule engine
ipcMain.handle('evaluate-har', async (event, harString) => {
  // Evaluate HAR against rules and dimensions, catching all errors
  try {
    // Parse HAR JSON
    const harJson = JSON.parse(harString);
    // Load engine and definitions
    const ruleEngine = require(path.join(__dirname, 'lib', 'ruleEngine'));
    const rulesDir = path.join(__dirname, 'rules');
    const dimsDir = path.join(__dirname, 'dimensions');
    const rules = [];
    const dimensions = [];
    // Load only JSON/YAML files from rules directory
    if (fs.existsSync(rulesDir)) {
      const ruleFiles = fs.readdirSync(rulesDir).filter(fn => /\.(ya?ml|json)$/i.test(fn));
      for (const f of ruleFiles) {
        try {
          const content = fs.readFileSync(path.join(rulesDir, f), 'utf8');
          const obj = f.toLowerCase().endsWith('.json')
            ? JSON.parse(content)
            : require('js-yaml').load(content);
          if (obj) rules.push(obj);
        } catch (e) {
          console.error(`Failed to load rule file ${f}:`, e);
        }
      }
    }
    // Load only JSON/YAML files from dimensions directory
    if (fs.existsSync(dimsDir)) {
      const dimFiles = fs.readdirSync(dimsDir).filter(fn => /\.(ya?ml|json)$/i.test(fn));
      for (const f of dimFiles) {
        try {
          const content = fs.readFileSync(path.join(dimsDir, f), 'utf8');
          const obj = f.toLowerCase().endsWith('.json')
            ? JSON.parse(content)
            : require('js-yaml').load(content);
          if (obj) dimensions.push(obj);
        } catch (e) {
          console.error(`Failed to load dimension file ${f}:`, e);
        }
      }
    }
    // Diagnostic: list loaded rules and dimensions
    console.log('evaluate-har: Loaded rules:', rules.map(r => r.id || r.name));
    console.log('evaluate-har: Loaded dims:', dimensions.map(d => d && d.key));
    // Run evaluation
    const result = ruleEngine.evaluate(harJson, rules, dimensions);
    console.log('evaluate-har: Result computed');
    return result;
  } catch (err) {
    console.error('evaluate-har handler error:', err);
    return { error: err && err.message ? err.message : String(err) };
  }
});