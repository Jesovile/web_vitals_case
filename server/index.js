/**
 * Demo backend. Zero dependencies – only Node.js built-ins.
 *
 *   GET  /                      → index.html (case catalogue)
 *   GET  /<file>                → static files from STATIC_DIR (default public/), bandwidth-throttled
 *   GET  /slow/<ms>/<file>      → same static file, but the response starts after <ms> milliseconds
 *                                 (simulates a slow CDN / third-party origin)
 *   GET  /api/hero              → hero image config (800 ms latency)     – LCP case
 *   GET  /api/promo             → promo banner content (1200 ms latency) – CLS case
 *   GET  /ttfb/broken           → server-rendered page – TTFB case (server/ttfb.js)
 *   GET  /ttfb/fixed            → only with STATIC_DIR=solution (solution/server/ttfb.js)
 *   POST /api/vitals            → RUM beacon endpoint (web-vitals reports from the browser)
 *   GET  /api/vitals            → last collected reports (used by /vitals.html)
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Directory with static files: `public` (the task) by default, `solution` to serve the reference solution.
const STATIC_DIR = process.env.STATIC_DIR || 'public';
const PUBLIC_DIR = path.join(ROOT, STATIC_DIR);
// The TTFB case lives on the server: the task version is server/ttfb.js, the reference solution
// (broken + fixed renderers) is solution/server/ttfb.js.
const ttfb = await import(
  STATIC_DIR === 'solution' ? '../solution/server/ttfb.js' : './ttfb.js'
);
const PORT = Number(process.env.PORT) || 3000;
// Simulated network bandwidth for static files in KB/s. localhost is too fast to feel the pain of
// heavy resources, so we slow them down by default. Set THROTTLE_KBPS=0 to disable.
const THROTTLE_KBPS = Number(process.env.THROTTLE_KBPS ?? 1024);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': MIME['.json'],
    'Content-Length': Buffer.byteLength(data),
    'Cache-Control': 'no-store',
  });
  res.end(data);
}

function sendText(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

async function writeThrottled(res, data) {
  if (!THROTTLE_KBPS) return res.end(data);
  const tickMs = 50;
  const chunkSize = Math.max(1024, Math.floor((THROTTLE_KBPS * 1024 * tickMs) / 1000));
  for (let i = 0; i < data.length; i += chunkSize) {
    if (res.destroyed) return;
    res.write(data.subarray(i, i + chunkSize));
    if (i + chunkSize < data.length) await sleep(tickMs);
  }
  res.end();
}

async function serveStatic(req, res, urlPath) {
  let rel;
  try {
    rel = decodeURIComponent(urlPath);
  } catch {
    return sendText(res, 400, 'Bad request');
  }
  if (rel.endsWith('/')) rel += 'index.html';
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) return sendText(res, 403, 'Forbidden');

  let data;
  try {
    data = await readFile(filePath);
  } catch {
    return sendText(res, 404, 'Not found');
  }

  res.writeHead(200, {
    'Content-Type': MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': data.length,
    // Caching is disabled on purpose so every reload reproduces the "first visit" experience.
    // In production, serve fingerprinted assets with `Cache-Control: public, max-age=31536000, immutable`.
    'Cache-Control': 'no-store',
  });
  if (req.method === 'HEAD') return res.end();
  await writeThrottled(res, data);
}

const vitalsLog = [];

async function readBody(req, limit = 64 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('Payload too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function handleVitalsBeacon(req, res) {
  try {
    const payload = JSON.parse(await readBody(req));
    const metrics = Array.isArray(payload.metrics) ? payload.metrics : [];
    for (const m of metrics) {
      const entry = {
        time: new Date().toISOString(),
        page: String(payload.page ?? 'unknown'),
        name: String(m.name),
        value: Number(m.value),
        rating: String(m.rating),
        detail: String(m.detail ?? ''),
      };
      vitalsLog.push(entry);
      const value = entry.name === 'CLS' ? entry.value.toFixed(3) : `${Math.round(entry.value)} ms`;
      console.log(`[vitals] ${entry.page.padEnd(12)} ${entry.name.padEnd(4)} ${value.padStart(9)}  ${entry.rating}`);
    }
    if (vitalsLog.length > 1000) vitalsLog.splice(0, vitalsLog.length - 1000);
    res.writeHead(204).end();
  } catch (err) {
    sendText(res, 400, err.message);
  }
}

async function route(req, res) {
  const { pathname } = new URL(req.url, 'http://localhost');

  if (pathname === '/api/vitals') {
    if (req.method === 'POST') return handleVitalsBeacon(req, res);
    return sendJson(res, 200, vitalsLog.slice(-200).reverse());
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') return sendText(res, 405, 'Method not allowed');

  if (pathname === '/api/hero') {
    await sleep(800); // a typical "CMS/config" API round trip
    return sendJson(res, 200, {
      src: '/images/hero-original.png',
      alt: 'Mountains at sunset',
    });
  }

  if (pathname === '/api/promo') {
    await sleep(1200); // ad server / personalization service
    return sendJson(res, 200, {
      text: '🔥 Autumn sale: −30% on all hiking gear. Use code HIKE30 at checkout.',
    });
  }

  if (pathname === '/ttfb/broken') return ttfb.renderTtfbBroken(req, res);
  if (pathname === '/ttfb/fixed' && ttfb.renderTtfbFixed) return ttfb.renderTtfbFixed(req, res);

  const slow = pathname.match(/^\/slow\/(\d{1,5})(\/.+)$/);
  if (slow) {
    await sleep(Math.min(Number(slow[1]), 10_000));
    return serveStatic(req, res, slow[2]);
  }

  return serveStatic(req, res, pathname);
}

const server = http.createServer((req, res) => {
  const started = Date.now();
  res.on('finish', () => {
    if (process.env.LOG_REQUESTS) console.log(`${req.method} ${req.url} ${res.statusCode} ${Date.now() - started}ms`);
  });
  route(req, res).catch((err) => {
    console.error(err);
    if (!res.headersSent) sendText(res, 500, 'Internal server error');
    else res.end();
  });
});

server.listen(PORT, () => {
  console.log(`Web Vitals case running at http://localhost:${PORT} (serving ${path.relative(ROOT, PUBLIC_DIR)}/)`);
  console.log(
    THROTTLE_KBPS
      ? `Static files are throttled to ${THROTTLE_KBPS} KB/s (set THROTTLE_KBPS=0 to disable)`
      : 'Static file throttling is disabled',
  );
});
