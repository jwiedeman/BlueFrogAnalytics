// Main API server providing profile management and website test endpoints
import express from 'express';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Client } from 'cassandra-driver';
import { createHash } from 'crypto';
import fs from 'fs';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { createTagHealthRouter } from './tagHealth.js';
import { createToolsRouter } from "./tools.js";
import { spawn, execFile } from 'child_process';

// Basic security headers and rate limiting without extra dependencies
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
};

const rateMap = new Map();
const RATE_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT = 100;
const rateLimiter = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const hits = (rateMap.get(ip) || []).filter(ts => now - ts < RATE_WINDOW);
  hits.push(now);
  rateMap.set(ip, hits);
  if (hits.length > RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
};

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
const firebaseApp = initializeApp({
  credential: cert(JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8')))
});
const firebaseAuth = getAuth(firebaseApp);

const cassandraClient = new Client({
  contactPoints: (process.env.CASSANDRA_CONTACT_POINTS || '127.0.0.1').split(','),
  localDataCenter: process.env.CASSANDRA_LOCAL_DATA_CENTER || 'datacenter1',
  keyspace: process.env.CASSANDRA_KEYSPACE || 'profiles',
  socketOptions: { readTimeout: 120000 }
});

await cassandraClient.connect();
await cassandraClient.execute(`
  CREATE TABLE IF NOT EXISTS user_profiles (
    uid text PRIMARY KEY,
    first_name text,
    last_name text,
    email text,
    phone text,
    payment_preference text,
    domains text,
    tests text
  )
`);

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));
app.use(securityHeaders);
app.use(rateLimiter);

let lastMapsDb = null;

async function updateTest(uid, name, data) {
  const result = await cassandraClient.execute(
    'SELECT tests FROM user_profiles WHERE uid = ?',
    [uid],
    { prepare: true }
  );
  let tests = {};
  if (result.rows.length && result.rows[0].tests) {
    try {
      tests = JSON.parse(result.rows[0].tests);
    } catch {}
  }
  tests[name] = data;
  await cassandraClient.execute(
    'UPDATE user_profiles SET tests = ? WHERE uid = ?',
    [JSON.stringify(tests), uid],
    { prepare: true }
  );
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  let token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    req.uid = createHash('sha256').update(decoded.uid).digest('hex');
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

app.use('/api/tag-health', authMiddleware, createTagHealthRouter(updateTest));
app.use('/api/tools', authMiddleware, createToolsRouter(updateTest));

app.post('/api/profile', authMiddleware, async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    paymentPreference,
    domains = [],
    tests = {}
  } = req.body;
  if (
    typeof firstName !== 'string' ||
    typeof lastName !== 'string' ||
    typeof email !== 'string' ||
    typeof phone !== 'string' ||
    typeof paymentPreference !== 'string' ||
    !Array.isArray(domains) ||
    typeof tests !== 'object' || tests === null
  ) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  try {
    await cassandraClient.execute(
      'INSERT INTO user_profiles (uid, first_name, last_name, email, phone, payment_preference, domains, tests) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        req.uid,
        firstName,
        lastName,
        email,
        phone,
        paymentPreference,
        JSON.stringify(domains),
        JSON.stringify(tests)
      ],
      { prepare: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/performance', authMiddleware, async (req, res) => {
  const { url } = req.body;
  if (typeof url !== 'string') {
    return res.status(400).json({ error: 'Invalid url' });
  }
  try {
    const chrome = await launch({ chromeFlags: ['--headless', '--no-sandbox'] });
    const { lhr } = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      onlyCategories: ['performance']
    });
    await chrome.kill();
    await updateTest(req.uid, 'performance', lhr);
    res.json(lhr);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lighthouse error' });
  }
});

app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const result = await cassandraClient.execute(
      'SELECT * FROM user_profiles WHERE uid = ?',
      [req.uid],
      { prepare: true }
    );
    const profile = result.rows[0] || {};
    if (profile.domains) {
      try {
        profile.domains = JSON.parse(profile.domains);
      } catch {
        profile.domains = [];
      }
    }
    if (profile.tests) {
      try {
        profile.tests = JSON.parse(profile.tests);
      } catch {
        profile.tests = {};
      }
    }
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});


app.post('/api/audit/accessibility', authMiddleware, async (req, res) => {
  const { url } = req.body;

  if (typeof url !== 'string') {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  try {
    const { launch } = await import('chrome-launcher');
    const lh = (await import('lighthouse')).default;
    const chrome = await launch({ chromeFlags: ['--headless'] });
  const options = { port: chrome.port, onlyCategories: ['accessibility'] };
    const result = await lh(url, options);
    await chrome.kill();
    await updateTest(req.uid, 'accessibility', result.lhr);
    res.json(result.lhr);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Audit failed' });
  }
});


app.post('/api/seo-audit', authMiddleware, async (req, res) => {
  const { url } = req.body;

  if (typeof url !== 'string') {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  try {

    const { launch } = await import('chrome-launcher');
    const lh = (await import('lighthouse')).default;
    const chrome = await launch({ chromeFlags: ['--headless'] });
    const options = { port: chrome.port, onlyCategories: ['seo'] };
    const result = await lh(url, options);
    await chrome.kill();
    await updateTest(req.uid, 'seo', result.lhr);
    res.json(result.lhr);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Audit failed' });

  }
});

// Launch the Google Maps scraper worker
app.post('/api/google-maps-scraper', async (req, res) => {
  const { query, total } = req.body;
  if (typeof query !== 'string' || typeof total !== 'number') {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  const filename = `maps_${Date.now()}.csv`;
  const outputPath = `output/${filename}`;
  const child = spawn('python', [
    'bots/WORKER-GoogleMapsScraper/worker.py',
    query,
    String(total),
    outputPath
  ]);
  child.on('error', (err) => console.error('scraper error', err));
  child.stderr.on('data', (d) => console.error(d.toString()));
  lastMapsDb = outputPath;
  res.json({ file: outputPath });
});

app.get('/api/google-maps-progress', async (req, res) => {
  const db = req.query.db || lastMapsDb;
  if (!db) {
    return res.json({ total: 0, latest: [] });
  }
  try {
    const totalOut = await new Promise((resolve, reject) => {
      execFile('sqlite3', [db, 'SELECT COUNT(*) FROM businesses;'], (err, out) => {
        if (err) return reject(err);
        resolve(out);
      });
    });
    const latestOut = await new Promise((resolve, reject) => {
      execFile(
        'sqlite3',
        [db, "SELECT name, address FROM businesses ORDER BY rowid DESC LIMIT 10;"],
        (err, out) => {
          if (err) return reject(err);
          resolve(out);
        }
      );
    });
    const total = Number(totalOut.trim() || '0');
    const latest = latestOut
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [name, address] = line.split('|');
        return { name, address };
      });
    res.json({ total, latest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB query failed' });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log('API server running on port', port));
