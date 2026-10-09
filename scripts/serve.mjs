// Zero-dependency static server for local development: node scripts/serve.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
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
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(root, path));
    if (!file.startsWith(root) || /[\\/]\./.test(file.slice(root.length))) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    if (!(await stat(file)).isFile()) throw new Error('not a file');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
});

// An explicitly requested port must be free; the default walks up to the next free one.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && !requested && port < 4341) {
    console.log(`Port ${port} is busy, trying ${port + 1}...`);
    server.listen(++port);
    return;
  }
  console.error(err.code === 'EADDRINUSE' ? `Port ${port} is already in use. Pass another: npm run dev -- 4400` : err);
  process.exit(1);
});

server.on('listening', () => console.log(`Bright site running at http://localhost:${port}`));
server.listen(port);
