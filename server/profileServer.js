import express from 'express';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Client } from 'cassandra-driver';
import fs from 'fs';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
const firebaseApp = initializeApp({
  credential: cert(JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8')))
});
const firebaseAuth = getAuth(firebaseApp);

const cassandraClient = new Client({
  contactPoints: (process.env.CASSANDRA_CONTACT_POINTS || '127.0.0.1').split(','),
  localDataCenter: process.env.CASSANDRA_LOCAL_DATA_CENTER || 'datacenter1',
  keyspace: process.env.CASSANDRA_KEYSPACE || 'profiles'
});

await cassandraClient.connect();
await cassandraClient.execute(`
  CREATE TABLE IF NOT EXISTS user_profiles (
    uid text PRIMARY KEY,
    name text,
    payment_preference text,
    domains list<text>,
    tests map<text,int>
  )
`);

const app = express();
app.use(express.json());

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    req.uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

app.post('/api/profile', authMiddleware, async (req, res) => {
  const { name, paymentPreference, domains = [], tests = {} } = req.body;
  try {
    await cassandraClient.execute(
      'INSERT INTO user_profiles (uid, name, payment_preference, domains, tests) VALUES (?, ?, ?, ?, ?)',
      [req.uid, name, paymentPreference, domains, tests],
      { prepare: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const result = await cassandraClient.execute(
      'SELECT * FROM user_profiles WHERE uid = ?',
      [req.uid],
      { prepare: true }
    );
    res.json(result.rows[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log('Profile server running on port', port));
