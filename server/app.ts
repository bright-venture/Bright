import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";

// The HTTP API, shared by every entry point: the Vite dev server, the standalone
// Node server (boot.ts) and the Vercel function (vercel.ts).
const app = new Hono();

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
