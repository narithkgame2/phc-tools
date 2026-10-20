const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8888;
const ROOT = path.resolve(__dirname);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  // Route: Cockpit Dashboard (default root)
  if (urlPath === '/' || urlPath === '/cockpit') {
    const file = path.join(ROOT, 'bot-system-cockpit.html');
    if (fs.existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(file));
    }
  }

  // Route: Telegram Mini App visual catalog
  if (urlPath === '/catalog' || urlPath === '/miniapp') {
    const file = path.join(ROOT, 'telegram-catalog.html');
    if (fs.existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(file));
    }
  }

  // Route: Live Bot State JSON
  if (urlPath === '/state' || urlPath === '/api/state') {
    const file = path.join(ROOT, 'data', 'bot-state.json');
    if (fs.existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      return res.end(fs.readFileSync(file));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'bot-state.json not found' }));
    }
  }

  // Fallback to static file in phc-tools
  const safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(ROOT, safePath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    return res.end(fs.readFileSync(filePath));
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`[Cockpit Server] Running on http://localhost:${PORT}`);
  console.log(`  - Cockpit Dashboard: http://localhost:${PORT}/cockpit`);
  console.log(`  - Mini App Catalog:  http://localhost:${PORT}/catalog`);
  console.log(`  - Live Bot State:    http://localhost:${PORT}/state`);
});
