// Simple Node.js + Express server that serves index.html and /health endpoint
// Usage:
// 1. npm init -y
// 2. npm install express
// 3. node server.js
//
// Health URL: http://localhost:3000/health

const express = require('express');
const os = require('os');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));

// health endpoint
app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const now = new Date().toISOString();
  const payload = {
    status: 'ok',
    uptime_seconds: Math.floor(uptime),
    time: now,
    hostname: os.hostname()
  };
  // respond with 200 normally
  res.json(payload);
});

// add a route to simulate failure (for testing) - optional
app.get('/health/fail', (req, res) => {
  res.status(500).json({ status: 'error', message: 'simulated failure' });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
