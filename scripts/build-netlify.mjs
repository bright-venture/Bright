// Bundles the server into Netlify functions (netlify/functions/*.mjs):
//   api.mjs                — the whole API (routed from /api/* in netlify.toml)
//   cleanup-documents.mjs  — daily scheduled clean-up (schedule in netlify.toml)
// Pre-bundling here (instead of letting Netlify bundle server/ itself) keeps the
// "@contracts/*" / "@db/*" path aliases working. Run after `vite build`.
import { build } from "esbuild";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const fnDir = path.join(root, "netlify/functions");

const functions = {
  api: "server/netlify.ts",
  "cleanup-documents": "server/netlify-cleanup.ts",
};

rmSync(fnDir, { recursive: true, force: true });
mkdirSync(fnDir, { recursive: true });

for (const [name, entry] of Object.entries(functions)) {
  await build({
    entryPoints: [path.join(root, entry)],
    outfile: path.join(fnDir, `${name}.mjs`),
    bundle: true,
    platform: "node",
    target: "node22",
    format: "esm",
    banner: {
      js: "import { createRequire } from 'module';const require = createRequire(import.meta.url);",
    },
    logLevel: "warning",
  });
  console.log(`Netlify function ready: netlify/functions/${name}.mjs`);
}
