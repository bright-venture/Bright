import { serve } from "@hono/node-server";
import { compress } from "hono/compress";
import app from "./app";
import { serveStaticFiles } from "./lib/vite";

// Standalone Node server (local production run, Docker, any VPS).
// Netlify/CDNs compress on their own; here we do it ourselves.
app.use(compress());
serveStaticFiles(app);

const port = parseInt(process.env.PORT || "3000");
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, () => {
  console.log(`Server running on http://localhost:${port}/`);
});
