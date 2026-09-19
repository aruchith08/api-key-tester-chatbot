import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import path from 'path';
import { isPermittedUrl } from './api/proxy.ts';

function devProxyPlugin(): Plugin {
  return {
    name: 'arh-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/proxy', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*',
          });
          res.end();
          return;
        }

        const reqUrl = req.url || '';
        const urlObj = new URL(reqUrl, 'http://localhost:5173');
        const targetUrl = urlObj.searchParams.get('url');

        if (!targetUrl) {
          res.writeHead(400, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ error: 'Missing target url parameter' }));
          return;
        }

        if (!isPermittedUrl(targetUrl)) {
          res.writeHead(403, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ error: 'Target URL host is not permitted by proxy allowlist policy' }));
          return;
        }

        let bodyBuffer: Buffer | undefined;
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(chunk);
          }
          bodyBuffer = Buffer.concat(chunks);
        }

        const forwardHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(req.headers)) {
          const lower = key.toLowerCase();
          if (!['host', 'connection', 'content-length', 'origin', 'referer', 'accept-encoding'].includes(lower) && value) {
            forwardHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
          }
        }

        try {
          const upstreamRes = await fetch(targetUrl, {
            method: req.method,
            headers: forwardHeaders,
            body: bodyBuffer,
            redirect: 'manual'
          });

          const resHeaders: Record<string, string> = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*',
          };

          upstreamRes.headers.forEach((val, key) => {
            const lower = key.toLowerCase();
            if (!['content-length', 'transfer-encoding', 'connection', 'content-encoding'].includes(lower)) {
              resHeaders[key] = val;
            }
          });

          res.writeHead(upstreamRes.status, resHeaders);

          if (upstreamRes.body) {
            const reader = upstreamRes.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
          }
          res.end();
        } catch (err: any) {
          if (!res.headersSent) {
            res.writeHead(502, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });
          }
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/proxy', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*',
          });
          res.end();
          return;
        }

        const reqUrl = req.url || '';
        const urlObj = new URL(reqUrl, 'http://localhost:5173');
        const targetUrl = urlObj.searchParams.get('url');

        if (!targetUrl) {
          res.writeHead(400, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ error: 'Missing target url parameter' }));
          return;
        }

        if (!isPermittedUrl(targetUrl)) {
          res.writeHead(403, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ error: 'Target URL host is not permitted by proxy allowlist policy' }));
          return;
        }

        let bodyBuffer: Buffer | undefined;
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(chunk);
          }
          bodyBuffer = Buffer.concat(chunks);
        }

        const forwardHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(req.headers)) {
          const lower = key.toLowerCase();
          if (!['host', 'connection', 'content-length', 'origin', 'referer', 'accept-encoding'].includes(lower) && value) {
            forwardHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
          }
        }

        try {
          const upstreamRes = await fetch(targetUrl, {
            method: req.method,
            headers: forwardHeaders,
            body: bodyBuffer,
            redirect: 'manual'
          });

          const resHeaders: Record<string, string> = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*',
          };

          upstreamRes.headers.forEach((val, key) => {
            const lower = key.toLowerCase();
            if (!['content-length', 'transfer-encoding', 'connection', 'content-encoding'].includes(lower)) {
              resHeaders[key] = val;
            }
          });

          res.writeHead(upstreamRes.status, resHeaders);

          if (upstreamRes.body) {
            const reader = upstreamRes.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
          }
          res.end();
        } catch (err: any) {
          if (!res.headersSent) {
            res.writeHead(502, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });
          }
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), devProxyPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  }
});
