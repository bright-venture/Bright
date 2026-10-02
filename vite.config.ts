import devServer from "@hono/vite-dev-server";
import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = import.meta.dirname;

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    devServer({ entry: "server/app.ts", exclude: [/^\/(?!api\/).*$/] }),
    react(),
  ],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@contracts": path.resolve(__dirname, "./contracts"),
      "@db": path.resolve(__dirname, "./db"),
    },
  },
  envDir: path.resolve(__dirname),
  define: {
    // Netlify sets COMMIT_REF while building: crash reports say which version broke.
    "import.meta.env.VITE_RELEASE": JSON.stringify((process.env.COMMIT_REF ?? "local").slice(0, 7)),
  },
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    // Built files have content hashes in their names, so netlify.toml caches /_app/ for a
    // year. Kept apart from public/assets/, whose images keep their names when replaced.
    assetsDir: "_app",
  },
});
