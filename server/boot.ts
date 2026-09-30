import { serve } from "@hono/node-server";
import app from "./app";
import { serveStaticFiles } from "./lib/vite";

// Standalone Node server (local production run, Docker, any VPS).
serveStaticFiles(app);

const port = parseInt(process.env.PORT || "3000");
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, () => {
  console.log(`Server running on http://localhost:${port}/`);
});
