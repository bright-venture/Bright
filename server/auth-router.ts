import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";

export const authRouter = createRouter({
  // Returns null for anonymous visitors so the UI can render without an error.
  me: publicQuery.query(({ ctx }) => {
    if (ctx.accountLoadFailed) {
      // Signed in with Supabase, but the app account couldn't be loaded: say so
      // instead of looking signed out (which made "Sign in" appear to do nothing).
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Signed in, but your account couldn't be loaded. Please try again shortly.",
      });
    }
    return ctx.user ?? null;
  }),
});
