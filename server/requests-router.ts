import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { createRouter, customerQuery } from "./middleware";
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
  CANCEL_REQUESTABLE_STATUSES,
  isValidVisitDate,
  TIME_SLOTS,
  todayInBeirut,
  validateAnswers,
} from "@contracts/workflow";
import { profilePhotoUrl, userUploadPrefix } from "./lib/storage";
import { isInLebanon } from "@contracts/geo";
import { isValidPhone } from "@contracts/phone";
import { applyTransition, findRequest, logEvent, type RequestScope } from "./lib/workflow";

const mediaItem = z.object({
  key: z.string().max(512),
  fileName: z.string().max(512),
  size: z.number().int().nonnegative(),
  contentType: z.string().max(128).optional(),
});

const byId = z.object({ id: z.number().int() });

export const requestsRouter = createRouter({
  create: customerQuery
    .input(
      z.object({
        category: z.string().max(64),
        answers: z.record(z.string().max(64), z.string().max(500)),
        preferredDate: z.string().max(10),
        timeSlot: z.enum(TIME_SLOTS),
        area: z.string().trim().min(1).max(255),
        address: z.string().trim().min(1).max(1000),
        phone: z.string().trim().max(64).refine(isValidPhone, "Invalid phone number"),
        notes: z.string().max(4000).optional(),
        media: z.array(mediaItem).max(8).default([]),
        // Map pin for the visit address.
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.termsAcceptedAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Please accept the Terms of Service and Privacy Policy" });
      }
      if (!CATEGORY_MAP[input.category]) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown category" });
      }
      const answerError = validateAnswers(input.category, input.answers);
      if (answerError) throw new TRPCError({ code: "BAD_REQUEST", message: answerError });
      if (!isValidVisitDate(input.preferredDate, todayInBeirut())) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a date from today onwards" });
      }
      if (!isInLebanon(input.lat, input.lng)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Place the pin on your address in Lebanon" });
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
            lat: input.lat,
            lng: input.lng,
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

  mine: customerQuery.query(async ({ ctx }) => {
    return getDb()
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.userId, ctx.user.id))
      .orderBy(desc(serviceRequests.createdAt));
  }),

  get: customerQuery.input(byId).query(async ({ ctx, input }) => {
    const db = getDb();
    const scope: RequestScope = { customerId: ctx.user.id };
    const row = await findRequest(db, input.id, scope).catch(async (error) => {
      // Distinguish "someone else's request" from "doesn't exist" for clearer errors.
      if (await findRequest(db, input.id, "any").catch(() => null)) {
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
      technician: row.technicianId
        ? { name: tech?.name ?? null, photoUrl: await profilePhotoUrl(tech?.avatar) }
        : null,
      // Live location is only shared while the job is active.
      location: loc ? { lat: loc.lat, lng: loc.lng, updatedAt: loc.updatedAt } : null,
    };
  }),

  /** `amount` is the price the customer saw: if the specialist changed it meanwhile, refuse. */
  approveQuote: customerQuery
    .input(z.object({ id: z.number().int(), amount: z.string().max(32) }))
    .mutation(async ({ ctx, input }) => {
      await applyTransition({
        id: input.id,
        name: "approveQuote",
        actorId: ctx.user.id,
        scope: { customerId: ctx.user.id },
        guard: (row) =>
          row.quoteAmount !== input.amount
            ? `The price was just updated to $${row.quoteAmount}. Please check it before approving.`
            : null,
      });
      return { ok: true };
    }),

  /** After scheduling the customer can't cancel directly; this flags it for a specialist. */
  requestCancel: customerQuery
    .input(z.object({ id: z.number().int(), reason: z.string().trim().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      await getDb().transaction(async (tx) => {
        const row = await findRequest(tx, input.id, { customerId: ctx.user.id }, true);
        if (!CANCEL_REQUESTABLE_STATUSES.includes(row.status)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This request can't be cancelled this way" });
        }
        if (row.cancelRequestedAt) return; // already asked
        await tx
          .update(serviceRequests)
          .set({ cancelRequestedAt: new Date(), cancelReason: input.reason || null })
          .where(eq(serviceRequests.id, row.id));
        await logEvent(tx, row.id, "cancel_requested", ctx.user.id, input.reason || null);
      });
      return { ok: true };
    }),

  cancel: customerQuery.input(byId).mutation(async ({ ctx, input }) => {
    await applyTransition({
      id: input.id,
      name: "cancel",
      actorId: ctx.user.id,
      scope: { customerId: ctx.user.id },
    });
    return { ok: true };
  }),
});
