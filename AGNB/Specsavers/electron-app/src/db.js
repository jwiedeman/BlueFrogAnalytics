const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const sqlite3 = require('sqlite3').verbose();

// Use Electron userData path for writable location
const dbDir = app.getPath('userData');
const dbPath = path.join(dbDir, 'qa_proxy.sqlite3');
// Ensure directory exists
fs.mkdirSync(dbDir, { recursive: true });

// Open (or create) the SQLite database
const db = new sqlite3.Database(dbPath);
// Initialize tables
db.serialize(() => {
  // Config key/value store
  db.run(`CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);
  // Sessions storage
  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    flows TEXT,
    processed TEXT
  )`);
  // Dimensions dictionary
  db.run(`CREATE TABLE IF NOT EXISTS dimensions (
    key TEXT PRIMARY KEY,
    description TEXT,
    operator TEXT,
    expected TEXT,
    pass_msg TEXT,
    fail_msg TEXT
  )`);
});

/**
 * Retrieve a JSON-serializable config value by key.
 * @param {string} key
 * @returns {Promise<any>} Parsed value or null
 */
function getConfig(key) {
  return new Promise((resolve, reject) => {
    db.get('SELECT value FROM config WHERE key = ?', [key], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(null);
      try {
        resolve(JSON.parse(row.value));
      } catch (e) {
        resolve(null);
      }
    });
  });
}

/**
 * Store a JSON-serializable config value by key.
 * @param {string} key
 * @param {any} value
 * @returns {Promise<void>}
 */
function setConfig(key, value) {
  return new Promise((resolve, reject) => {
    const json = JSON.stringify(value);
    db.run(
      'INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)',
      [key, json],
      err => (err ? reject(err) : resolve())
    );
  });
}

/**
 * Persist a session with flows and processed hits.
 * @param {string} id
 * @param {string} timestamp (ISO string)
 * @param {object[]} flows
 * @param {object[]} processedFlows
 * @returns {Promise<void>}
 */
function saveSession(id, timestamp, flows, processedFlows) {
  return new Promise((resolve, reject) => {
    const f = JSON.stringify(flows || []);
    const p = JSON.stringify(processedFlows || []);
    db.run(
      'INSERT OR REPLACE INTO sessions (id, timestamp, flows, processed) VALUES (?, ?, ?, ?)',
      [id, timestamp, f, p],
      err => (err ? reject(err) : resolve())
    );
  });
}
/**
 * Retrieve all sessions (id and timestamp).
 * @returns {Promise<Array<{id: string, timestamp: string}>>}
 */
function getSessions() {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, timestamp FROM sessions ORDER BY timestamp DESC', (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}
/**
 * Retrieve full session data by id.
 * @param {string} id
 * @returns {Promise<{id: string, timestamp: string, flows: object[], processed: object[]}>>}
 */
function getSession(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM sessions WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(null);
      let flows, processed;
      try { flows = JSON.parse(row.flows); } catch { flows = []; }
      try { processed = JSON.parse(row.processed); } catch { processed = []; }
      resolve({ id: row.id, timestamp: row.timestamp, flows, processed });
    });
  });
}
// Export DB API
module.exports = { getConfig, setConfig, dbPath, saveSession, getSessions, getSession };
/**
 * Get all dimensions definitions.
 * @returns {Promise<Array<{key:string,description:string,operator:string,expected:string,pass_msg:string,fail_msg:string}>>}
 */
function getDimensions() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM dimensions ORDER BY key', (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}
/**
 * Add or update a dimension definition.
 * @param {{key:string,description?:string,operator?:string,expected?:string,pass_msg?:string,fail_msg?:string}} dim
 * @returns {Promise<void>}
 */
function setDimension(dim) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO dimensions
       (key, description, operator, expected, pass_msg, fail_msg)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [dim.key, dim.description || '', dim.operator || '', dim.expected || '', dim.pass_msg || '', dim.fail_msg || ''],
      err => (err ? reject(err) : resolve())
    );
  });
}
/**
 * Remove a dimension definition by key.
 * @param {string} key
 * @returns {Promise<void>}
 */
function removeDimension(key) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM dimensions WHERE key = ?', [key], err => (err ? reject(err) : resolve()));
  });
}
module.exports = { getConfig, setConfig, dbPath, saveSession, getSessions, getSession,
  getDimensions, setDimension, removeDimension };