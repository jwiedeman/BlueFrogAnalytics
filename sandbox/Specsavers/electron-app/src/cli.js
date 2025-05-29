#!/usr/bin/env node
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const commander = require('commander');
const fs = require('fs');
const os = require('os');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const ProxyServer = require('./proxy');
const net = require('net');
/**
 * Find a free TCP port, starting at the given port and incrementing until one is available.
 * @param {number} port - Starting port to test
 * @returns {Promise<number>} - Promise resolving to an available port
 */
const findFreePort = (port) => new Promise((resolve) => {
  const server = net.createServer();
  server.unref();
  server.on('error', () => {
    server.close();
    // try next port
    resolve(findFreePort(port + 1));
  });
  server.listen(port, () => {
    const free = server.address().port;
    server.close(() => resolve(free));
  });
});

// CLI options
const program = new commander.Command();
program
  .option('--init', 'Initialize default config')
  .option('--headless', 'Run API server only')
  .option('--port <port>', 'API server port', '50000');
program.parse(process.argv);
const options = program.opts();
const PORT = parseInt(options.port, 10);
// Setup lowdb with local project folder; fallback to user homedir if not writable
const dataDir = path.join(__dirname, 'data');
const projectDbFile = path.join(dataDir, 'db.json');
let adapter;
let db;
let dbPath;
// Ensure dataDir exists and is writable
let useFallback = false;
try {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.accessSync(dataDir, fs.constants.W_OK);
} catch (e) {
  useFallback = true;
}
if (!useFallback) {
  adapter = new FileSync(projectDbFile);
  db = low(adapter);
  dbPath = projectDbFile;
} else {
  const fallbackDir = path.join(os.homedir(), '.qa-proxy');
  fs.mkdirSync(fallbackDir, { recursive: true });
  const fallbackDbFile = path.join(fallbackDir, 'db.json');
  adapter = new FileSync(fallbackDbFile);
  db = low(adapter);
  dbPath = fallbackDbFile;
  console.warn(`Using fallback data directory ${fallbackDir}`);
}
// Initialize defaults
db.defaults({ whitelist: [], rules: [] }).write();

// Initialize default config
// Initialize default config values in the database
function initConfig() {
  const defaultWhitelist = [
    "smetrics.adobe.com",
    "www.google-analytics.com"
  ];
  const defaultRules = [
    {
      id: "adobe_event1",
      domain: "smetrics.adobe.com",
      method: "GET",
      path: "/b/ss/*",
      conditions: [
        { extractor: "query.c.on", type: "equals", value: "event1" }
      ],
      children: ["adobe_page_info"]
    },
    {
      id: "adobe_page_info",
      domain: "smetrics.adobe.com",
      method: "GET",
      path: "/b/ss/*",
      conditions: [
        { extractor: "query.pageName", type: "exists" },
        { extractor: "query.pageTitle", type: "exists" }
      ],
      children: []
    }
  ];
  db.set('whitelist', defaultWhitelist).write();
  db.set('rules', defaultRules).write();
  console.log('Initialized default config at', dbPath);
}

if (options.init) {
  initConfig();
  process.exit(0);
}

// Proxy lifecycle
let proxyInstance = null;
// Store raw flows for UI
let flows = [];
// Store processed hits (flows with rule evaluation)
let processedFlows = [];
// Store completed sessions for export and analysis
let sessions = [];
/**
 * Start the MITM proxy, finding an available port (starting at 8080).
 */
async function startProxy() {
  const whitelist = db.get('whitelist').value();
  const rules = db.get('rules').value();
  // Prepare SSL CA directory for MITM proxy certificates in user home
  const homeDir = os.homedir();
  const caDir = path.join(homeDir, '.qa-proxy', 'ca');
  fs.mkdirSync(caDir, { recursive: true });
  console.log(`Using SSL CA directory: ${caDir}`);
  // Find a free port starting from 8080
  const port = await findFreePort(8080);
  proxyInstance = new ProxyServer(whitelist, rules, { sslCaDir: caDir });
  // Reset stored flows and subscribe to new flow events
  flows = [];
  processedFlows = [];
  proxyInstance.on('flow', flow => flows.push(flow));
  // Subscribe to processed flow events (rule evaluations)
  proxyInstance.on('processedFlow', pf => processedFlows.push(pf));
  // Start proxy on chosen port
  proxyInstance.start(port);
}
function stopProxy() {
  if (proxyInstance) {
    // Save current session
    const sid = Date.now().toString();
    sessions.push({ id: sid, timestamp: new Date().toISOString(), flows, processedFlows });
    proxyInstance.stop();
    proxyInstance = null;
  }
}

if (options.headless) {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  // Whitelist endpoints
  app.get('/api/whitelist', (req, res) => {
    res.json(db.get('whitelist').value());
  });
  app.post('/api/whitelist', (req, res) => {
    const data = Array.isArray(req.body) ? req.body : [];
    db.set('whitelist', data).write();
    res.sendStatus(204);
  });

  // Rules endpoints
  app.get('/api/rules', (req, res) => {
    res.json({ rules: db.get('rules').value() });
  });
  app.post('/api/rules', (req, res) => {
    const body = req.body || {};
    if (Array.isArray(body.rules)) {
      db.set('rules', body.rules).write();
      res.sendStatus(204);
    } else {
      res.status(400).send('Invalid rules payload');
    }
  });

  // Proxy control
  app.post('/api/start', (req, res) => { startProxy(); res.json({ running: true }); });
  app.post('/api/stop', (req, res) => { stopProxy(); res.json({ running: false }); });
  app.get('/api/status', (req, res) => {
    res.json({ running: proxyInstance !== null });
  });
  // Raw flows endpoints
  app.get('/api/flows', (req, res) => {
    res.json(flows);
  });
  app.post('/api/flows/clear', (req, res) => {
    flows = [];
    res.sendStatus(204);
  });
  // Processed hits endpoints
  app.get('/api/processed', (req, res) => {
    res.json(processedFlows);
  });
  app.post('/api/processed/clear', (req, res) => {
    processedFlows = [];
    res.sendStatus(204);
  });
  // Sessions endpoints
  app.get('/api/sessions', (req, res) => {
    res.json(sessions.map(s => ({ id: s.id, timestamp: s.timestamp })));
  });
  app.get('/api/sessions/:id', (req, res) => {
    const sess = sessions.find(s => s.id === req.params.id);
    if (!sess) return res.status(404).send('Session not found');
    res.json(sess);
  });
  app.post('/api/sessions/:id/export', (req, res) => {
    const sess = sessions.find(s => s.id === req.params.id);
    if (!sess) return res.status(404).send('Session not found');
    // Return raw flows as HAR-like JSON
    res.json({ flows: sess.flows, processed: sess.processedFlows });
  });
  // Processed hits endpoints
  app.get('/api/processed', (req, res) => {
    res.json(processedFlows);
  });
  app.post('/api/processed/clear', (req, res) => {
    processedFlows = [];
    res.sendStatus(204);
  });

  // Start API server on configured port
  // Listen only on localhost to avoid permission issues
  app.listen(PORT, '127.0.0.1')
    .on('listening', () => console.log(`QA Proxy API listening on port ${PORT}`))
    .on('error', err => console.error(`API server failed to start on port ${PORT}:`, err));
} else {
  // CLI mode: start proxy immediately
  startProxy();
}