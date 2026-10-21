// Local development for everything: builds the website, serves it, and starts the employee portal,
// joined on one address like the TomatoSky app:
//   http://127.0.0.1:3000/         the brightlb.com website (all pages and languages)
//   http://127.0.0.1:3000/login    the employee portal (also /portal, /auth/..., /m/<id>)
// Run: npm run dev   (Ctrl+C stops both). Website only: npm run dev:site
import { spawn, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';

const PORTAL = 'http://127.0.0.1:3000';

if (!existsSync('portal/node_modules')) {
  console.error('The portal is not installed yet. Run: npm install --prefix portal');
  process.exit(1);
}
// npm sets this to its own script; running it with node avoids a shell (paths with spaces break there).
const npm = process.env.npm_execpath;
if (!npm) {
  console.error('Start this with: npm run dev');
  process.exit(1);
}

// The website server sits behind the portal, so any free port works; prefer 4321.
const freePort = port => new Promise(done => {
  const probe = createServer().once('error', () => done(freePort(port + 1)));
  probe.listen(port, '127.0.0.1', () => probe.close(() => done(port)));
});
const sitePort = await freePort(4321);

execFileSync(process.execPath, ['scripts/build.mjs'], { stdio: 'inherit' });

const children = [];
const start = (name, args, env = {}) => {
  const child = spawn(process.execPath, args, { env: { ...process.env, ...env } });
  const prefix = line => line && console.log(`[${name}] ${line}`);
  child.stdout.on('data', data => data.toString().split(/\r?\n/).forEach(prefix));
  child.stderr.on('data', data => data.toString().split(/\r?\n/).forEach(prefix));
  child.on('exit', code => { console.log(`[${name}] stopped (${code})`); stop(); });
  children.push(child);
};
let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null) continue;
    // On Windows, kill() stops npm but not the Next.js server it started; end the whole tree.
    if (process.platform === 'win32') {
      try { execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {}
    } else child.kill();
  }
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

start('site', ['scripts/serve.mjs', String(sitePort)]);
start('portal', [npm, '--prefix', 'portal', 'run', 'dev'], { SITE_DEV_ORIGIN: `http://127.0.0.1:${sitePort}` });
setTimeout(() => console.log(`\n  Open ${PORTAL}  (website)   and   ${PORTAL}/login  (employee portal)\n`), 4000);
