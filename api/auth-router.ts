import { createRouter, publicQuery } from "./middleware";

export const authRouter = createRouter({
  // Returns null for anonymous visitors so the UI can render without an error.
  me: publicQuery.query(({ ctx }) => ctx.user ?? null),
});
