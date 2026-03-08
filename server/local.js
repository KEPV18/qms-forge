import express from 'express';
import dotenv from 'dotenv';
import authStart from '../api/auth/index.js';
import authCallback from '../api/auth/callback.js';
import tokenHandler from '../api/token.js';
const app = express();
app.disable('x-powered-by');

dotenv.config();

// Basic JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  console.log('Incoming:', req.method, req.url);
  next();
});

// Mount serverless handlers
app.get('/api/auth', (req, res) => authStart(req, res));
app.get('/api/auth/callback', (req, res) => authCallback(req, res));
app.get('/oauth2callback', (req, res) => authCallback(req, res));
app.get('/api/auth/google/callback', (req, res) => authCallback(req, res));
app.get('/api/token', (req, res) => tokenHandler(req, res));

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`\n================================================`);
  console.log(`QMS Unified Server (Local): http://localhost:${port}`);
  console.log(`OAuth Callback: http://localhost:${port}/api/auth/callback`);
  console.log(`================================================\n`);
});
