import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users } from "../db/schema";
import { LEGAL_VERSION } from "@contracts/legal";

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

  /** Record that the signed-in user accepts the current Terms and Privacy Policy. */
  acceptTerms: authedQuery.mutation(async ({ ctx }) => {
    await getDb()
      .update(users)
      .set({ termsAcceptedAt: new Date(), termsVersion: LEGAL_VERSION })
      .where(eq(users.id, ctx.user.id));
    return { ok: true, version: LEGAL_VERSION };
  }),
});
