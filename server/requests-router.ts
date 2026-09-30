import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
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
import { userUploadPrefix } from "./lib/storage";

const mediaItem = z.object({
  key: z.string().max(512),
  fileName: z.string().max(512),
  size: z.number().int().nonnegative(),
  contentType: z.string().max(128).optional(),
});

export const requestsRouter = createRouter({
  create: authedQuery
    .input(
      z.object({
        category: z.string().max(64),
        answers: z.record(z.string(), z.string()),
        preferredDate: z.string().min(1).max(32),
        timeSlot: z.string().min(1).max(32),
        area: z.string().min(1).max(255),
        address: z.string().min(1),
        phone: z.string().min(3).max(64),
        notes: z.string().max(4000).optional(),
        media: z.array(mediaItem).max(8).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!CATEGORY_MAP[input.category]) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unknown category",
        });
      }
      const prefix = userUploadPrefix(ctx.user.authId);
      if (input.media.some(m => !m.key.startsWith(prefix))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid media" });
      }
      const urgency = computeUrgency(input.category, input.answers);
      const db = getDb();
      const [created] = await db
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
      const id = created.id;
      if (input.media.length) {
        await db.insert(requestMedia).values(
          input.media.map(m => ({
            requestId: id,
            key: m.key,
            fileName: m.fileName,
            size: m.size,
            contentType: m.contentType ?? null,
          }))
        );
      }
      await db.insert(requestEvents).values({
        requestId: id,
        status: "submitted",
        actorId: ctx.user.id,
      });
      return { id, urgency: urgency.level };
    }),

  mine: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.userId, ctx.user.id))
      .orderBy(desc(serviceRequests.createdAt));
  }),

  get: authedQuery
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const row = await db.query.serviceRequests.findFirst({
        where: eq(serviceRequests.id, input.id),
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const media = await db
        .select()
        .from(requestMedia)
        .where(eq(requestMedia.requestId, row.id));
      const events = await db
        .select()
        .from(requestEvents)
        .where(eq(requestEvents.requestId, row.id))
        .orderBy(desc(requestEvents.createdAt));
      // Technician identity + live location (active jobs only)
      let technician: { name: string | null } | null = null;
      let location: { lat: string; lng: string; updatedAt: Date } | null = null;
      if (row.technicianId) {
        const tech = await db.query.users.findFirst({
          where: eq(users.id, row.technicianId!),
        });
        technician = { name: tech?.name ?? null };
        if (["scheduled", "in_progress"].includes(row.status)) {
          const loc = await db.query.technicianLocations.findFirst({
            where: eq(technicianLocations.requestId, row.id),
          });
          if (loc) {
            location = { lat: loc.lat, lng: loc.lng, updatedAt: loc.updatedAt };
          }
        }
      }
      return { request: row, media, events, technician, location };
    }),

  approveQuote: authedQuery
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const row = await db.query.serviceRequests.findFirst({
        where: eq(serviceRequests.id, input.id),
      });
      if (!row || row.userId !== ctx.user.id)
        throw new TRPCError({ code: "NOT_FOUND" });
      if (row.status !== "quote_ready")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No quote pending",
        });
      await db
        .update(serviceRequests)
        .set({ status: "approved" })
        .where(eq(serviceRequests.id, row.id));
      await db.insert(requestEvents).values({
        requestId: row.id,
        status: "approved",
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),

  cancel: authedQuery
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const row = await db.query.serviceRequests.findFirst({
        where: and(
          eq(serviceRequests.id, input.id),
          eq(serviceRequests.userId, ctx.user.id)
        ),
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (["completed", "cancelled"].includes(row.status))
        throw new TRPCError({ code: "BAD_REQUEST" });
      await db
        .update(serviceRequests)
        .set({ status: "cancelled" })
        .where(eq(serviceRequests.id, row.id));
      await db.insert(requestEvents).values({
        requestId: row.id,
        status: "cancelled",
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),
});
