import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { requestEvents, requestMedia, serviceRequests, users } from "../db/schema";
import type { RequestStatus, UrgencyLevel } from "@contracts/services";
import { QUOTE_AMOUNT_PATTERN, URGENCY_LEVELS } from "@contracts/workflow";
import { applyTransition, findRequest } from "./lib/workflow";

const byId = z.object({ id: z.number().int() });

// Queue order: open cases first, most urgent first, then oldest first.
const CLOSED: readonly RequestStatus[] = ["completed", "cancelled"];
const URGENCY_RANK: Record<UrgencyLevel, number> = { critical: 0, urgent: 1, priority: 2, normal: 3 };

export const adminRouter = createRouter({
  queue: adminQuery.query(async () => {
    const rows = await getDb()
      .select({
        request: serviceRequests,
        customerName: users.name,
        customerEmail: users.email,
      })
      .from(serviceRequests)
      .leftJoin(users, eq(serviceRequests.userId, users.id))
      .orderBy(desc(serviceRequests.createdAt))
      .limit(500);
    const rank = (r: (typeof rows)[number]["request"]) => [
      CLOSED.includes(r.status) ? 1 : 0,
      URGENCY_RANK[r.urgencyFinal ?? r.urgencySuggested],
      r.createdAt.getTime(),
    ];
    return rows.sort((a, b) => {
      const [x, y] = [rank(a.request), rank(b.request)];
      return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
    });
  }),

  detail: adminQuery.input(byId).query(async ({ input }) => {
    const db = getDb();
    const row = await findRequest(db, input.id, "any");
    const [customer, media, events] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, row.userId) }),
      db.select().from(requestMedia).where(eq(requestMedia.requestId, row.id)),
      db
        .select()
        .from(requestEvents)
        .where(eq(requestEvents.requestId, row.id))
        .orderBy(desc(requestEvents.createdAt)),
    ]);
    return { request: row, customer, media, events };
  }),

  startReview: adminQuery
    .input(z.object({ id: z.number().int(), urgency: z.enum(URGENCY_LEVELS) }))
    .mutation(async ({ ctx, input }) => {
      await applyTransition({
        id: input.id,
        name: "startReview",
        actorId: ctx.user.id,
        scope: "any",
        patch: { urgencyFinal: input.urgency },
        note: `Urgency confirmed: ${input.urgency}`,
      });
      return { ok: true };
    }),

  sendQuote: adminQuery
    .input(
      z.object({
        id: z.number().int(),
        amount: z.string().trim().regex(QUOTE_AMOUNT_PATTERN, "Enter the amount in USD, e.g. 45 or 45.50"),
        note: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await applyTransition({
        id: input.id,
        name: "sendQuote",
        actorId: ctx.user.id,
        scope: "any",
        patch: { quoteAmount: input.amount, quoteNote: input.note ?? null },
        note: `Quote: $${input.amount}${input.note ? ` — ${input.note}` : ""}`,
      });
      return { ok: true };
    }),

  /** Specialist moves an approved job forward: schedule → start → complete. */
  setStatus: adminQuery
    .input(
      z.object({
        id: z.number().int(),
        status: z.enum(["scheduled", "in_progress", "completed"]),
        note: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const name = ({ scheduled: "schedule", in_progress: "startWork", completed: "complete" } as const)[
        input.status
      ];
      await applyTransition({
        id: input.id,
        name,
        actorId: ctx.user.id,
        scope: "any",
        note: input.note,
        guard: (row) =>
          name === "schedule" && !row.technicianId ? "Assign a technician before scheduling" : null,
      });
      return { ok: true };
    }),
});
