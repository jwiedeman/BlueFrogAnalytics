const { app, BrowserWindow, ipcMain, session } = require('electron');
// Configure proxy settings: bypass local addresses, route all HTTP(S) via local MITM proxy
app.commandLine.appendSwitch('proxy-bypass-list', '127.0.0.1,localhost');
app.commandLine.appendSwitch('proxy-server', '127.0.0.1:8080');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { getConfig, setConfig, dbPath, saveSession, getSessions, getSession } = require('./src/db');
const ProxyServer = require('./src/proxy');
// Support custom HTTPS agent with extra CA certificates for proxy-to-server TLS
const https = require('https');
const { getDimensions, setDimension, removeDimension } = require('./src/db');
// To run elevated commands (e.g. keychain import)
const { exec } = require('child_process');

// Electron data directory (for CA fallback and session storage)
const userDataDir = app.getPath('userData');
fs.mkdirSync(userDataDir, { recursive: true });
// State containers
let proxyInstance = null;
let flows = [];
let processedFlows = [];
// Sessions are persisted in SQLite via saveSession/getSessions/getSession
// Proxy lifecycle
/**
 * Starts the QA MITM proxy.
 *
 * - Reads whitelist & rules from lowdb.
 * - Generates a root CA and per-host certificates under <userData>/ca.
 * - Creates an HTTPS agent using the root CA for upstream connections.
 * - Listens on port 8080 (or next free port for CLI).
 *
 * Certificate directory:
 *   <userData>/ca/certs/ca.pem         (root CA)
 *   <userData>/ca/keys/ca.private.key  (root key)
 *   <userData>/ca/certs/<host>.pem     (host cert)
 *   <userData>/ca/keys/<host>.key      (host key)
 *
 * Import the root CA into your OS/browser to trust MITM certificates.
 */
async function startProxy() {
  // Load configuration from SQLite
  const whitelist = (await getConfig('whitelist')) || [];
  const rules = (await getConfig('rules')) || [];
  // Store certificates in userData folder for persistence
  const caDir = path.join(userDataDir, 'ca');
  fs.mkdirSync(caDir, { recursive: true });
  console.log(`Using SSL CA directory: ${caDir}`);
  // Build proxy options with SSL CA directory
  const proxyOpts = { sslCaDir: caDir };
  // TODO: Replace with the path to your CA bundle for internal/self-signed certs
  const caCertPath = path.join(__dirname, 'certs', 'your-root-ca.pem');
  if (fs.existsSync(caCertPath)) {
    const caCert = fs.readFileSync(caCertPath);
    proxyOpts.httpsAgent = new https.Agent({ keepAlive: true, ca: caCert });
  }
  proxyInstance = new ProxyServer(whitelist, rules, proxyOpts);
  flows = [];
  processedFlows = [];
  proxyInstance.on('flow', flow => flows.push(flow));
  proxyInstance.on('processedFlow', pf => processedFlows.push(pf));
  // Start proxy on port 8080
  proxyInstance.start(8080);
}
async function stopProxy() {
  if (proxyInstance) {
    // Persist the session to the database
    const id = Date.now().toString();
    const timestamp = new Date().toISOString();
    try {
      await saveSession(id, timestamp, flows, processedFlows);
      console.log(`Session ${id} saved`);
    } catch (err) {
      console.error('Failed to save session:', err);
    }
    proxyInstance.stop();
    proxyInstance = null;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

// IPC handlers for config
ipcMain.handle('whitelist-get', async () => {
  return (await getConfig('whitelist')) || [];
});
ipcMain.handle('whitelist-set', async (e, list) => {
  await setConfig('whitelist', list);
  return true;
});
// Add a single domain to whitelist
ipcMain.handle('whitelist-add', async (e, domain) => {
  const wl = (await getConfig('whitelist')) || [];
  if (!wl.includes(domain)) wl.push(domain);
  await setConfig('whitelist', wl);
  return wl;
});
// Remove a single domain from whitelist
ipcMain.handle('whitelist-remove', async (e, domain) => {
  const wl = (await getConfig('whitelist')) || [];
  const filtered = wl.filter(d => d !== domain);
  await setConfig('whitelist', filtered);
  return filtered;
});
// Edit/update a domain in whitelist
ipcMain.handle('whitelist-update', async (e, { oldDomain, newDomain }) => {
  const wl = (await getConfig('whitelist')) || [];
  const idx = wl.indexOf(oldDomain);
  if (idx !== -1) wl[idx] = newDomain;
  await setConfig('whitelist', wl);
  return wl;
});
ipcMain.handle('rules-get', async () => {
  return (await getConfig('rules')) || [];
});
ipcMain.handle('rules-set', async (e, rules) => {
  await setConfig('rules', rules);
  return true;
});
ipcMain.handle('start-proxy', async () => { await startProxy(); return true; });
ipcMain.handle('stop-proxy', async () => { await stopProxy(); return true; });
ipcMain.handle('proxy-status', () => proxyInstance !== null);
ipcMain.handle('flows-get', () => flows);
ipcMain.handle('flows-clear', () => { flows = []; });
ipcMain.handle('processed-get', () => processedFlows);
ipcMain.handle('processed-clear', () => { processedFlows = []; });
ipcMain.handle('sessions-get', async () => await getSessions());
ipcMain.handle('sessions-export', async (e, id) => await getSession(id));
// Session recording controls
ipcMain.handle('start-session-recording', async () => {
  // Clear in-memory flows; proxy remains running
  flows = [];
  processedFlows = [];
  return true;
});
ipcMain.handle('stop-session-recording', async () => {
  const id = Date.now().toString();
  const timestamp = new Date().toISOString();
  try {
    await saveSession(id, timestamp, flows, processedFlows);
    console.log(`Session ${id} recorded`);
  } catch (err) {
    console.error('Failed to record session:', err);
  }
  // Clear in-memory
  flows = [];
  processedFlows = [];
  return true;
});
// Import/export session HAR
ipcMain.handle('import-session', async (e, sessObj) => {
  const id = sessObj.id || Date.now().toString();
  const timestamp = sessObj.timestamp || new Date().toISOString();
  const flowsArr = sessObj.flows || [];
  const processedArr = sessObj.processed || [];
  try {
    await saveSession(id, timestamp, flowsArr, processedArr);
    console.log(`Imported session ${id}`);
    return { id, timestamp };
  } catch (err) {
    console.error('Failed to import session:', err);
    return null;
  }
});
// Process a recorded or imported session
const RuleEngine = require('./src/ruleEngine');
ipcMain.handle('process-session', async (e, id) => {
  const sess = await getSession(id);
  if (!sess) return [];
  const rules = (await getConfig('rules')) || [];
  const engine = new RuleEngine(rules);
  const processed = sess.flows.map(flow => ({ flow, results: engine.process(flow) }));
  // Update processed column in DB
  try {
    await saveSession(id, sess.timestamp, sess.flows, processed);
  } catch (err) {
    console.error('Failed to save processed session:', err);
  }
  return processed;
});
// Dimensions CRUD
ipcMain.handle('get-dimensions', async () => await getDimensions());
ipcMain.handle('set-dimension', async (e, dim) => { await setDimension(dim); return true; });
ipcMain.handle('remove-dimension', async (e, key) => { await removeDimension(key); return true; });

// Sync CA cert into macOS keychain (prompts for admin password)
ipcMain.handle('sync-ca', async () => {
  if (process.platform !== 'darwin') return false;
  const caDir = path.join(userDataDir, 'ca');
  const caCert = path.join(caDir, 'certs', 'ca.pem');
  const cmd = `osascript -e 'do shell script "security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${caCert}" with administrator privileges'`;
  return new Promise(resolve => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error('Sync CA failed:', stderr || err);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
});
// Regenerate CA: delete existing, restart proxy with new CA
ipcMain.handle('regenerate-ca', async () => {
  const caDir = path.join(userDataDir, 'ca');
  try { fs.rmSync(caDir, { recursive: true, force: true }); } catch (_) {}
  if (proxyInstance) {
    proxyInstance.stop();
    proxyInstance = null;
  }
  try {
    await startProxy();
    return true;
  } catch (err) {
    console.error('Failed to regenerate CA and restart proxy:', err);
    return false;
  }
});
// Export and import entire database
ipcMain.handle('export-db', async () => {
  try {
    const data = fs.readFileSync(dbPath);
    // return base64 string for safe IPC transfer
    return data.toString('base64');
  } catch (err) {
    console.error('Failed to read DB file:', err);
    return null;
  }
});
ipcMain.handle('import-db', async (e, buf) => {
  try {
    // buf is base64 string
    const data = Buffer.from(buf, 'base64');
    fs.writeFileSync(dbPath, data);
    return true;
  } catch (err) {
    console.error('Failed to import DB file:', err);
    return false;
  }
});

// On ready: start the proxy, apply session proxy, then create the main window
app.whenReady()
  .then(async () => {
    // Log configuration database location
    console.log(`Database path: ${dbPath}`);
    // Ensure config defaults exist (only on first run)
    const defaultWhitelist = [
      'www.google-analytics.com',
      'ssl.google-analytics.com',
      'analytics.google.com',
      'smetrics.adobe.com',
      'tags.tiqcdn.com',
      'collect.tealiumiq.com'
    ];
    try {
      const wl = await getConfig('whitelist');
      if (wl === null) await setConfig('whitelist', defaultWhitelist);
      const rl = await getConfig('rules');
      if (rl === null) await setConfig('rules', []);
    } catch (err) {
      console.error('Failed to initialize config defaults:', err);
    }
    // Open the app UI immediately
    createWindow();
    // Configure Electron session to proxy through our MITM
    try {
      await session.defaultSession.setProxy({
        proxyRules: '127.0.0.1:8080',
        proxyBypassRules: '127.0.0.1;localhost',
      });
    } catch (err) {
      console.error('Failed to set proxy for Electron session:', err);
    }
    // Start MITM proxy in background (non-blocking)
    startProxy().catch(err => {
      console.error('Failed to start proxy:', err);
    });
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Ensure proxy is stopped
  stopProxy();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});