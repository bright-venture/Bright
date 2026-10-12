// Runs Lighthouse (mobile and desktop) on every page in sitemap.xml and prints the scores.
// Run: npm run audit   or narrow it by language, device or page, e.g. npm run audit -- ar mobile porter-services
// Add x3 (or x5) to run each page several times and keep the median run by performance score,
// as Lighthouse recommends, since single local runs are noisy.
// Uses the locally installed Chrome; reports go to the OS temp folder.
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 4455;
const args = process.argv.slice(2);
const LANGS = ['en', 'ar', 'el'], DEVICES = ['mobile', 'desktop'];
const RUNS = Number(args.find(a => /^x\d+$/.test(a))?.slice(1) || 1);
const options = args.filter(a => !/^x\d+$/.test(a));
const all = [...readFileSync('site/sitemap.xml', 'utf8').matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map(m => m[1]);
const langOf = path => LANGS.find(l => path.startsWith(`/${l}/`)) || 'en';
const slugOf = path => path.replace(/^\/(ar|el)\//, '/').replace(/\//g, '') || 'home';
const given = { langs: options.filter(a => LANGS.includes(a)), devices: options.filter(a => DEVICES.includes(a)), slugs: options.filter(a => !LANGS.includes(a) && !DEVICES.includes(a)) };
const PAGES = all.filter(path => (!given.langs.length || given.langs.includes(langOf(path))) && (!given.slugs.length || given.slugs.includes(slugOf(path))));
const FORM_FACTORS = given.devices.length ? given.devices : DEVICES;
const outDir = mkdtempSync(join(tmpdir(), 'bright-lighthouse-'));
const server = spawn(process.execPath, ['scripts/serve.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise(done => setTimeout(done, 800));

let failed = false;
try {
  for (const formFactor of FORM_FACTORS) {
    for (const page of PAGES) {
      const reports = [];
      for (let run = 1; run <= RUNS; run++) {
        const output = join(outDir, `${formFactor}${page.replace(/\//g, '-')}run${run}.json`);
        const lighthouse = ['-y', 'lighthouse@13', `http://localhost:${PORT}${page}`, '--quiet', '--chrome-flags=--headless=new', '--output=json', `--output-path=${output}`];
        if (formFactor === 'desktop') lighthouse.push('--preset=desktop');
        execFileSync('npx', lighthouse, { stdio: 'inherit', shell: process.platform === 'win32' });
        reports.push(JSON.parse(readFileSync(output, 'utf8')));
      }
      reports.sort((a, b) => a.categories.performance.score - b.categories.performance.score);
      const report = reports[Math.floor(reports.length / 2)];
      const scores = Object.values(report.categories).map(c => `${c.title} ${Math.round(c.score * 100)}`);
      const spread = RUNS > 1 ? `  (perf runs: ${reports.map(r => Math.round(r.categories.performance.score * 100)).join(', ')})` : '';
      console.log(`${formFactor.padEnd(7)} ${page.padEnd(32)} ${scores.join(' | ')}${spread}`);
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
