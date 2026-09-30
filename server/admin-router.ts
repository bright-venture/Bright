import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { requestEvents, requestMedia, serviceRequests, users } from "../db/schema";

const urgencyEnum = z.enum(["normal", "priority", "urgent", "critical"]);
const statusEnum = z.enum(["scheduled", "in_progress", "completed"]);

export const adminRouter = createRouter({
  queue: adminQuery.query(async () => {
    const db = getDb();
    const rows = await db
      .select({
        request: serviceRequests,
        customerName: users.name,
        customerEmail: users.email,
      })
      .from(serviceRequests)
      .leftJoin(users, eq(serviceRequests.userId, users.id))
      .orderBy(desc(serviceRequests.createdAt));
    return rows;
  }),

  detail: adminQuery
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = getDb();
      const row = await db.query.serviceRequests.findFirst({
        where: eq(serviceRequests.id, input.id),
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      const customer = await db.query.users.findFirst({
        where: eq(users.id, row.userId),
      });
      const media = await db
        .select()
        .from(requestMedia)
        .where(eq(requestMedia.requestId, row.id));
      const events = await db
        .select()
        .from(requestEvents)
        .where(eq(requestEvents.requestId, row.id))
        .orderBy(desc(requestEvents.createdAt));
      return { request: row, customer, media, events };
    }),

  startReview: adminQuery
    .input(z.object({ id: z.number().int(), urgency: urgencyEnum }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const row = await db.query.serviceRequests.findFirst({
        where: eq(serviceRequests.id, input.id),
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.status !== "submitted")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already reviewed" });
      await db
        .update(serviceRequests)
        .set({ status: "in_review", urgencyFinal: input.urgency })
        .where(eq(serviceRequests.id, row.id));
      await db.insert(requestEvents).values({
        requestId: row.id,
        status: "in_review",
        note: `Urgency confirmed: ${input.urgency}`,
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),

  sendQuote: adminQuery
    .input(
      z.object({
        id: z.number().int(),
        amount: z.string().min(1).max(32),
        note: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const row = await db.query.serviceRequests.findFirst({
        where: eq(serviceRequests.id, input.id),
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (!["in_review", "submitted"].includes(row.status))
        throw new TRPCError({ code: "BAD_REQUEST", message: "Quote not expected now" });
      await db
        .update(serviceRequests)
        .set({
          status: "quote_ready",
          quoteAmount: input.amount,
          quoteNote: input.note ?? null,
        })
        .where(eq(serviceRequests.id, row.id));
      await db.insert(requestEvents).values({
        requestId: row.id,
        status: "quote_ready",
        note: `Quote: $${input.amount}${input.note ? ` — ${input.note}` : ""}`,
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),

  setStatus: adminQuery
    .input(
      z.object({
        id: z.number().int(),
        status: statusEnum,
        note: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const row = await db.query.serviceRequests.findFirst({
        where: eq(serviceRequests.id, input.id),
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      const allowed: Record<string, string[]> = {
        approved: ["scheduled"],
        scheduled: ["in_progress"],
        in_progress: ["completed"],
      };
      if (!(allowed[row.status] ?? []).includes(input.status))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot move ${row.status} → ${input.status}`,
        });
      await db
        .update(serviceRequests)
        .set({ status: input.status })
        .where(eq(serviceRequests.id, row.id));
      await db.insert(requestEvents).values({
        requestId: row.id,
        status: input.status,
        note: input.note ?? null,
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),
});
