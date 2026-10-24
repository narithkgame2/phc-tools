const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8888;
const ROOT = path.resolve(__dirname);

const projectRegistry = require('./engines/project-registry.js');
const { syncAllChannels } = require('./engines/channel-syncer.js');

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

  // Helper for CORS & JSON
  function sendJson(status, data) {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // Route: Canva Step Studio (default canvas)
  if (urlPath === '/' || urlPath === '/canvas' || urlPath === '/tree' || urlPath === '/figma') {
    const file = path.join(ROOT, 'studio', 'canvas.html');
    if (fs.existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(file));
    }
  }

  // Route: Cockpit Dashboard
  if (urlPath === '/cockpit') {
    const file = path.join(ROOT, 'studio', 'bot-system-cockpit.html');
    if (fs.existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(file));
    }
  }

  // Route: Telegram Mini App visual catalog
  if (urlPath === '/catalog' || urlPath === '/miniapp') {
    const file = path.join(ROOT, 'studio', 'telegram-catalog.html');
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
      return sendJson(404, { error: 'bot-state.json not found' });
    }
  }

  // Route: Chat Tree Configuration (GET to load, POST to save)
  if (urlPath === '/api/tree-config') {
    const file = path.join(ROOT, 'config', 'chat-tree-config.json');

    if (req.method === 'GET') {
      if (fs.existsSync(file)) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        return res.end(fs.readFileSync(file));
      } else {
        return sendJson(404, { error: 'chat-tree-config.json not found' });
      }
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          parsed.lastUpdated = new Date().toISOString().split('T')[0];
          fs.writeFileSync(file, JSON.stringify(parsed, null, 2), 'utf8');
          // Also sync to phc-tools/data if exists
          const backupFile = path.join(ROOT, '..', 'data', 'chat-tree-config.json');
          if (fs.existsSync(path.dirname(backupFile))) {
            fs.writeFileSync(backupFile, JSON.stringify(parsed, null, 2), 'utf8');
          }
          return sendJson(200, { success: true, message: 'Configuration saved successfully!' });
        } catch (e) {
          return sendJson(400, { success: false, error: e.message });
        }
      });
      return;
    }
  }

  // Route: Multi-Channel Scraped Inventory
  if (urlPath === '/inventory' || urlPath === '/channels' || urlPath === '/api/inventory') {
    const file = path.join(ROOT, 'data', 'multi-channel-inventory.json');
    if (fs.existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      return res.end(fs.readFileSync(file));
    } else {
      return sendJson(404, { error: 'multi-channel-inventory.json not found' });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // NEW API: ON-DEMAND CHANNEL RE-SYNC
  // ═══════════════════════════════════════════════════════════════
  if (urlPath === '/api/channels/sync' && req.method === 'POST') {
    syncAllChannels()
      .then(items => {
        sendJson(200, {
          success: true,
          message: `Successfully scraped and cleaned ${items.length} active listings across 5 channels!`,
          count: items.length,
          timestamp: new Date().toISOString()
        });
      })
      .catch(err => {
        sendJson(500, { success: false, error: err.message });
      });
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  // NEW API: DEVELOPER PROJECT REGISTRY (TS7 Units, Statuses, Price)
  // ═══════════════════════════════════════════════════════════════
  if (urlPath === '/api/project/units' && req.method === 'GET') {
    const project = projectRegistry.getProject('time-square-7');
    if (!project) return sendJson(404, { error: 'Project not found' });
    const units = project.unitTypes[0]?.availableUnits || [];
    return sendJson(200, {
      projectId: project.projectId,
      name: project.name,
      handover: project.projectDetails?.handover,
      promotion: project.activePromotion,
      totalUnits: units.length,
      availableCount: units.filter(u => u.status === 'available').length,
      soldCount: units.filter(u => u.status === 'sold').length,
      units
    });
  }

  // NEW API: TOGGLE UNIT STATUS (Available <-> Sold)
  if (urlPath === '/api/project/toggle-status' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { projectId, unitCode, status } = JSON.parse(body);
        const result = projectRegistry.updateUnitStatus(projectId || 'time-square-7', unitCode, status);
        return sendJson(result.success ? 200 : 400, result);
      } catch (e) {
        return sendJson(400, { success: false, error: e.message });
      }
    });
    return;
  }

  // NEW API: INGEST CSV PRICE LIST
  if (urlPath === '/api/project/upload-csv' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { projectId, csvContent } = JSON.parse(body);
        const result = projectRegistry.ingestCsvPriceList(projectId || 'time-square-7', csvContent);
        return sendJson(result.success ? 200 : 400, result);
      } catch (e) {
        return sendJson(400, { success: false, error: e.message });
      }
    });
    return;
  }

  // Fallback to static file in ROOT
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

// Listens on this Mac only by default (it serves live bot state). Set HOST=0.0.0.0 only on purpose.
const HOST = process.env.HOST || '127.0.0.1';
server.listen(PORT, HOST, () => {
  console.log(`[Cockpit & Studio Server] Running on http://localhost:${PORT}`);
  console.log(`  - Canva Step Studio: http://localhost:${PORT}/canvas`);
  console.log(`  - Cockpit Dashboard: http://localhost:${PORT}/cockpit`);
  console.log(`  - Mini App Catalog:  http://localhost:${PORT}/catalog`);
  console.log(`  - Live Bot State:    http://localhost:${PORT}/state`);
});
