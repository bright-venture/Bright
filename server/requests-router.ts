import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  requestEvents,
  requestMedia,
  serviceRequests,
  technicianLocations,
  users,
} from "../db/schema";
import { computeUrgency, CATEGORY_MAP } from "@contracts/services";
import {
  ACTIVE_JOB_STATUSES,
  isValidVisitDate,
  TIME_SLOTS,
  todayInBeirut,
  validateAnswers,
} from "@contracts/workflow";
import { userUploadPrefix } from "./lib/storage";
import { applyTransition, findRequest, logEvent, type RequestScope } from "./lib/workflow";

const mediaItem = z.object({
  key: z.string().max(512),
  fileName: z.string().max(512),
  size: z.number().int().nonnegative(),
  contentType: z.string().max(128).optional(),
});

const byId = z.object({ id: z.number().int() });

export const requestsRouter = createRouter({
  create: authedQuery
    .input(
      z.object({
        category: z.string().max(64),
        answers: z.record(z.string().max(64), z.string().max(500)),
        preferredDate: z.string().max(10),
        timeSlot: z.enum(TIME_SLOTS),
        area: z.string().trim().min(1).max(255),
        address: z.string().trim().min(1).max(1000),
        phone: z.string().trim().min(6).max(64),
        notes: z.string().max(4000).optional(),
        media: z.array(mediaItem).max(8).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!CATEGORY_MAP[input.category]) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown category" });
      }
      const answerError = validateAnswers(input.category, input.answers);
      if (answerError) throw new TRPCError({ code: "BAD_REQUEST", message: answerError });
      if (!isValidVisitDate(input.preferredDate, todayInBeirut())) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a date from today onwards" });
      }
      const prefix = userUploadPrefix(ctx.user.authId);
      if (input.media.some((m) => !m.key.startsWith(prefix))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid media" });
      }

      const urgency = computeUrgency(input.category, input.answers);
      const id = await getDb().transaction(async (tx) => {
        const [created] = await tx
          .insert(serviceRequests)
          .values({
            userId: ctx.user.id,
            category: input.category,
            answers: JSON.stringify(input.answers),
            urgencySuggested: urgency.level,
            status: "submitted",
            preferredDate: input.preferredDate,
            timeSlot: input.timeSlot,
            area: input.area,
            address: input.address,
            phone: input.phone,
            notes: input.notes ?? null,
          })
          .returning({ id: serviceRequests.id });
        if (input.media.length) {
          await tx.insert(requestMedia).values(
            input.media.map((m) => ({
              requestId: created.id,
              key: m.key,
              fileName: m.fileName,
              size: m.size,
              contentType: m.contentType ?? null,
            })),
          );
        }
        await logEvent(tx, created.id, "submitted", ctx.user.id);
        return created.id;
      });
      return { id, urgency: urgency.level };
    }),

  mine: authedQuery.query(async ({ ctx }) => {
    return getDb()
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.userId, ctx.user.id))
      .orderBy(desc(serviceRequests.createdAt));
  }),

  get: authedQuery.input(byId).query(async ({ ctx, input }) => {
    const db = getDb();
    const scope: RequestScope = ctx.user.role === "admin" ? "any" : { customerId: ctx.user.id };
    const row = await findRequest(db, input.id, scope).catch(async (error) => {
      // Distinguish "someone else's request" from "doesn't exist" for clearer errors.
      if (scope !== "any" && (await findRequest(db, input.id, "any").catch(() => null))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      throw error;
    });

    const active = ACTIVE_JOB_STATUSES.includes(row.status);
    const [media, events, tech, loc] = await Promise.all([
      db.select().from(requestMedia).where(eq(requestMedia.requestId, row.id)),
      db
        .select()
        .from(requestEvents)
        .where(eq(requestEvents.requestId, row.id))
        .orderBy(desc(requestEvents.createdAt)),
      row.technicianId
        ? db.query.users.findFirst({ where: eq(users.id, row.technicianId) })
        : undefined,
      row.technicianId && active
        ? db.query.technicianLocations.findFirst({
            where: eq(technicianLocations.requestId, row.id),
          })
        : undefined,
    ]);
    return {
      request: row,
      media,
      events,
      technician: row.technicianId ? { name: tech?.name ?? null } : null,
      // Live location is only shared while the job is active.
      location: loc ? { lat: loc.lat, lng: loc.lng, updatedAt: loc.updatedAt } : null,
    };
  }),

  approveQuote: authedQuery.input(byId).mutation(async ({ ctx, input }) => {
    await applyTransition({
      id: input.id,
      name: "approveQuote",
      actorId: ctx.user.id,
      scope: { customerId: ctx.user.id },
    });
    return { ok: true };
  }),

  cancel: authedQuery.input(byId).mutation(async ({ ctx, input }) => {
    await applyTransition({
      id: input.id,
      name: "cancel",
      actorId: ctx.user.id,
      scope: { customerId: ctx.user.id },
    });
    return { ok: true };
  }),
});
