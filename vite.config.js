import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import fs from 'fs';
import path from 'path';

function settingsApiPlugin() {
  const rootSettings = path.resolve(__dirname, 'settings.json');
  const publicSettings = path.resolve(__dirname, 'public', 'settings.json');

  return {
    name: 'settings-api',
    configureServer(server) {
      // 1. Settings storage API
      server.middlewares.use('/api/settings', (req, res, next) => {
        if (req.method === 'GET') {
          try {
            if (fs.existsSync(rootSettings)) {
              const data = fs.readFileSync(rootSettings, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(data);
              return;
            }
          } catch (e) {}
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({}));
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              const formatted = JSON.stringify(parsed, null, 2);

              fs.writeFileSync(rootSettings, formatted, 'utf-8');
              if (fs.existsSync(path.dirname(publicSettings))) {
                fs.writeFileSync(publicSettings, formatted, 'utf-8');
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, settings: parsed }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        next();
      });

      // 2. Solana RPC Proxy to eliminate 403 Forbidden and browser CORS rate limits
      server.middlewares.use('/api/solana-rpc', (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          const targets = [
            'https://solana-rpc.publicnode.com',
            'https://api.mainnet-beta.solana.com',
            'https://1rpc.io/sol',
          ];

          for (const target of targets) {
            try {
              const upstream = await fetch(target, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body,
              });

              if (upstream.ok) {
                const data = await upstream.text();
                res.setHeader('Content-Type', 'application/json');
                res.end(data);
                return;
              }
            } catch (err) {}
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ jsonrpc: '2.0', result: null, id: 1 }));
        });
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    settingsApiPlugin(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util', 'process'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  server: {
    port: 3000,
    host: true,
  },
  optimizeDeps: {
    include: [
      '@solana/web3.js',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'canvas-confetti',
      'buffer',
      'react',
      'react-dom',
    ],
    esbuildOptions: {
      target: 'es2020',
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
});
