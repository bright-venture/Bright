// Zero-dependency static server for local development: node scripts/serve.mjs [port]
// It only listens on this computer (127.0.0.1) and only serves the built site in site/,
// with the same headers Netlify applies from site/_headers.
import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = resolve(fileURLToPath(new URL('../site', import.meta.url)));
const realRoot = await realpath(root);
const HOST = '127.0.0.1';
// Netlify's _headers format; only the site-wide "/*" block is used here. Read on every request,
// because each build changes the CSP hashes and a stale policy would block the new inline code.
async function siteHeaders() {
  const headers = {};
  try {
    const lines = (await readFile(resolve(root, '_headers'), 'utf8')).split(/\r?\n/);
    let global = false;
    for (const line of lines) {
      if (/^\S/.test(line)) global = line.trim() === '/*';
      else if (global && line.includes(':')) headers[line.slice(0, line.indexOf(':')).trim()] = line.slice(line.indexOf(':') + 1).trim();
    }
  } catch {}
  return headers;
}
const requested = process.argv[2] || process.env.PORT;
let port = Number(requested || 4321);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

// Returns the file inside site/ for a URL path, or null if the path tries to leave it
// (../, encoded slashes or backslashes, sibling folders such as ../Bright-other, symlinks),
// or targets a hidden file or Netlify's config file.
async function resolveInside(path) {
  if (path.includes('\0')) return null;
  const file = resolve(root, '.' + sep + path);
  const rel = relative(root, file);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;
  const parts = rel.split(sep);
  if (parts.some(part => part.startsWith('.')) || rel === '_headers') return null;
  // Follow symlinks and check again, so a link cannot point outside the project.
  const real = await realpath(file);
  const realRel = relative(realRoot, real);
  if (!realRel || realRel.startsWith('..') || isAbsolute(realRel)) return null;
  return real;
}

const server = createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    let path = decodeURIComponent(pathname);
    if (path.endsWith('/')) path += 'index.html';
    let file;
    try {
      file = await resolveInside(path);
    } catch {
      file = undefined; // does not exist
    }
    if (file === null) {
      res.writeHead(403, { 'Content-Type': 'text/plain' }).end('Forbidden');
      return;
    }
    if (!file) throw new Error('not found');
    const info = await stat(file);
    // Folder URLs without a trailing slash redirect, as on Netlify: /ar -> /ar/
    if (info.isDirectory()) {
      res.writeHead(301, { Location: pathname + '/' }).end();
      return;
    }
    let body = await readFile(file);
    const type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
    const headers = { ...(await siteHeaders()), 'Content-Type': type, 'Cache-Control': 'no-cache' };
    // Compress text like the production host does, so local audits are representative.
    if (/text|json|xml|javascript/.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
      body = gzipSync(body);
      headers['Content-Encoding'] = 'gzip';
      headers.Vary = 'Accept-Encoding';
    }
    res.writeHead(200, headers);
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
});

// An explicitly requested port must be free; the default walks up to the next free one.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && !requested && port < 4341) {
    console.log(`Port ${port} is busy, trying ${port + 1}...`);
    server.listen(++port, HOST);
    return;
  }
  console.error(err.code === 'EADDRINUSE' ? `Port ${port} is already in use. Pass another: npm run dev -- 4400` : err);
  process.exit(1);
});

server.on('listening', () => console.log(`Bright site running at http://localhost:${port}`));
server.listen(port, HOST);
