import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { createRouter, publicQuery, specialistQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { technicianApplications, users } from "../db/schema";
import { CATEGORIES } from "../contracts/services";
import { AVAILABILITY, EXPERIENCE_LEVELS, MANUAL_APPLICATION_STATUSES } from "@contracts/applications";
import { getSupabaseAdmin } from "./lib/supabase";

const TRADE_IDS = CATEGORIES.map((c) => c.id) as [string, ...string[]];
const email = z.string().trim().toLowerCase().email().max(320);

/** Where the invitation link lands: set a password, then the technician's jobs page. */
function inviteRedirect(req: Request) {
  const origin = req.headers.get("origin") ?? process.env.SITE_URL;
  return origin && /^https?:\/\//.test(origin)
    ? `${origin}/reset-password?next=${encodeURIComponent("/tech")}&welcome=1`
    : undefined; // Supabase falls back to the project's Site URL
}

export const joinRouter = createRouter({
  // Public — technicians apply without an account.
  submit: publicQuery
    .input(
      z.object({
        name: z.string().trim().min(2).max(255),
        phone: z.string().trim().min(6).max(64),
        email,
        trade: z.enum(TRADE_IDS),
        area: z.string().trim().min(2).max(255),
        experience: z.enum(EXPERIENCE_LEVELS),
        availability: z.enum(AVAILABILITY),
        hasTools: z.boolean(),
        hasTransport: z.boolean(),
        notes: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [res] = await getDb()
        .insert(technicianApplications)
        .values({ ...input, notes: input.notes ?? null })
        .returning({ id: technicianApplications.id });
      return { id: res.id };
    }),

  list: specialistQuery.query(async () => {
    return getDb()
      .select()
      .from(technicianApplications)
      .orderBy(desc(technicianApplications.createdAt));
  }),

  setStatus: specialistQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(MANUAL_APPLICATION_STATUSES),
      }),
    )
    .mutation(async ({ input }) => {
      await getDb()
        .update(technicianApplications)
        .set({ status: input.status })
        .where(eq(technicianApplications.id, input.id));
      return { ok: true };
    }),

  /**
   * Hire an applicant: an existing account becomes a technician right away;
   * otherwise they're invited by email and their technician account is created now,
   * so they can be assigned jobs immediately.
   */
  hire: specialistQuery
    .input(z.object({ id: z.number().int().positive(), email: email.optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const app = await db.query.technicianApplications.findFirst({
        where: eq(technicianApplications.id, input.id),
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND" });
      const address = input.email ?? app.email?.toLowerCase();
      if (!address) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Add the applicant's email to hire them" });
      }

      let userId: number;
      let invited = false;
      const existing = await db.query.users.findFirst({ where: eq(users.email, address) });
      if (existing) {
        if (existing.role === "specialist") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This email belongs to a specialist" });
        }
        await db
          .update(users)
          .set({ role: "technician", phone: existing.phone ?? app.phone, name: existing.name ?? app.name })
          .where(eq(users.id, existing.id));
        userId = existing.id;
      } else {
        const { data, error } = await getSupabaseAdmin().auth.admin.inviteUserByEmail(address, {
          data: { full_name: app.name, phone: app.phone },
          redirectTo: inviteRedirect(ctx.req),
        });
        if (error || !data.user) {
          const already = error && /already|registered|exists/i.test(error.message);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: already
              ? "This email already has a login. Ask them to sign in once, then hire again."
              : `Could not send the invitation: ${error?.message ?? "unknown error"}`,
          });
        }
        const [created] = await db
          .insert(users)
          .values({ authId: data.user.id, email: address, name: app.name, phone: app.phone, role: "technician" })
          .onConflictDoUpdate({ target: users.authId, set: { role: "technician" } })
          .returning({ id: users.id });
        userId = created.id;
        invited = true;
      }

      await db
        .update(technicianApplications)
        .set({ status: "hired", hiredUserId: userId, email: address })
        .where(eq(technicianApplications.id, app.id));
      return { ok: true, invited, email: address };
    }),
});
