import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";

const app = new Hono<{ Bindings: HttpBindings }>();

// Media goes straight to Supabase Storage, so API bodies stay small.
app.use(bodyLimit({ maxSize: 1024 * 1024 }));
app.use(
  secureHeaders({
    contentSecurityPolicy: undefined,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  }),
);
app.get("/api/health", (c) => c.json({ ok: true }));
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
    onError: ({ path, error }) => {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error(`[trpc] ${path ?? "<unknown>"}`, error);
      }
    },
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
