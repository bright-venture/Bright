import { authRouter } from "./auth-router";
import { requestsRouter } from "./requests-router";
import { adminRouter } from "./admin-router";
import { techRouter } from "./tech-router";
import { storageRouter } from "./storage-router";
import { joinRouter } from "./join-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  requests: requestsRouter,
  admin: adminRouter,
  tech: techRouter,
  storage: storageRouter,
  join: joinRouter,
});

export type AppRouter = typeof appRouter;
