// Bundles the whole API into a single Netlify function (netlify/functions/api.mjs).
// Pre-bundling here (instead of letting Netlify bundle server/ itself) keeps the
// "@contracts/*" / "@db/*" path aliases working. Run after `vite build`.
import { build } from "esbuild";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const fnDir = path.join(root, "netlify/functions");

rmSync(fnDir, { recursive: true, force: true });
mkdirSync(fnDir, { recursive: true });

await build({
  entryPoints: [path.join(root, "server/netlify.ts")],
  outfile: path.join(fnDir, "api.mjs"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  banner: {
    js: "import { createRequire } from 'module';const require = createRequire(import.meta.url);",
  },
  logLevel: "warning",
});

console.log("Netlify function ready: netlify/functions/api.mjs");
