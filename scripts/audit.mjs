// Runs Lighthouse (mobile and desktop) on every page in sitemap.xml and prints the scores.
// Run: npm run audit   or narrow it by language, device or page, e.g. npm run audit -- ar mobile porter-services
// Uses the locally installed Chrome; reports go to the OS temp folder.
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 4455;
const args = process.argv.slice(2);
const LANGS = ['en', 'ar', 'el'], DEVICES = ['mobile', 'desktop'];
const all = [...readFileSync('sitemap.xml', 'utf8').matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map(m => m[1]);
const langOf = path => LANGS.find(l => path.startsWith(`/${l}/`)) || 'en';
const slugOf = path => path.replace(/^\/(ar|el)\//, '/').replace(/\//g, '') || 'home';
const given = { langs: args.filter(a => LANGS.includes(a)), devices: args.filter(a => DEVICES.includes(a)), slugs: args.filter(a => !LANGS.includes(a) && !DEVICES.includes(a)) };
const PAGES = all.filter(path => (!given.langs.length || given.langs.includes(langOf(path))) && (!given.slugs.length || given.slugs.includes(slugOf(path))));
const FORM_FACTORS = given.devices.length ? given.devices : DEVICES;
const outDir = mkdtempSync(join(tmpdir(), 'bright-lighthouse-'));
const server = spawn(process.execPath, ['scripts/serve.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise(done => setTimeout(done, 800));

let failed = false;
try {
  for (const formFactor of FORM_FACTORS) {
    for (const page of PAGES) {
      const output = join(outDir, `${formFactor}${page.replace(/\//g, '-')}report.json`);
      const args = ['-y', 'lighthouse@13', `http://localhost:${PORT}${page}`, '--quiet', '--chrome-flags=--headless=new', '--output=json', `--output-path=${output}`];
      if (formFactor === 'desktop') args.push('--preset=desktop');
      execFileSync('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' });
      const report = JSON.parse(readFileSync(output, 'utf8'));
      const scores = Object.values(report.categories).map(c => `${c.title} ${Math.round(c.score * 100)}`);
      console.log(`${formFactor.padEnd(7)} ${page.padEnd(32)} ${scores.join(' | ')}`);
      for (const category of Object.values(report.categories)) {
        if (category.score < 1) failed = true;
        for (const ref of category.auditRefs) {
          const audit = report.audits[ref.id];
          if (ref.weight > 0 && audit.score !== null && audit.score < 1) console.log(`    ${category.id}: ${audit.id} ${audit.displayValue || audit.score}`);
        }
      }
    }
  }
} finally {
  server.kill();
}
console.log(`Reports: ${outDir}`);
process.exit(failed ? 1 : 0);
