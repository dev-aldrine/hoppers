import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const rootSettings = path.resolve(__dirname, 'settings.json');
const distPath = path.resolve(__dirname, 'dist');

// Middleware for parsing JSON requests
app.use(express.json({ limit: '10mb' }));

// CORS headers for all incoming requests
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// 1. Settings API endpoint
let memorySettings = null;
try {
  if (fs.existsSync(rootSettings)) {
    memorySettings = JSON.parse(fs.readFileSync(rootSettings, 'utf-8'));
  }
} catch (err) {
  console.warn('[Settings] Failed to load initial settings.json:', err.message);
}

app.get('/api/settings', (req, res) => {
  try {
    if (fs.existsSync(rootSettings)) {
      const data = fs.readFileSync(rootSettings, 'utf-8');
      return res.type('application/json').send(data);
    }
  } catch (e) {}
  return res.json(memorySettings || {});
});

app.post('/api/settings', (req, res) => {
  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    memorySettings = {
      ...data,
      updatedAt: data.updatedAt || Date.now(),
    };
    const formatted = JSON.stringify(memorySettings, null, 2);

    try {
      fs.writeFileSync(rootSettings, formatted, 'utf-8');
    } catch (writeErr) {
      console.warn('[Settings] File write failed, saved in memory:', writeErr.message);
    }

    return res.status(200).json({ success: true, settings: memorySettings });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Solana RPC Proxy endpoint
app.post('/api/solana-rpc', async (req, res) => {
  const targets = [
    'https://rpc.ankr.com/solana',
    'https://solana-rpc.publicnode.com',
    'https://api.mainnet-beta.solana.com',
    'https://1rpc.io/sol',
  ];

  let body = '';
  if (typeof req.body === 'object' && req.body !== null) {
    body = JSON.stringify(req.body);
  } else if (typeof req.body === 'string') {
    body = req.body;
  } else {
    body = JSON.stringify(req.body || {});
  }

  for (const target of targets) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const upstream = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (upstream.ok) {
        const data = await upstream.text();
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).send(data);
      }
    } catch (err) {
      // Continue to next fallback target
    }
  }

  return res.status(200).json({ jsonrpc: '2.0', result: null, id: 1 });
});

// Static assets caching headers
app.use((req, res, next) => {
  if (/\.(mp3|png|ico|glb|svg|woff2?)$/i.test(req.path) || req.path.startsWith('/assets/') || req.path.startsWith('/models/')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  next();
});

// Serve frontend production build
app.use(express.static(distPath));

// Fallback to index.html for SPA client-side routing
app.use((req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Production build not found. Please run "npm run build".');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Production server running on http://0.0.0.0:${PORT}`);
});
