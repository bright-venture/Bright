import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { createRouter, technicianQuery, specialistQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { requestMedia, serviceRequests, technicianLocations, users } from "../db/schema";
import { ACTIVE_JOB_STATUSES, ASSIGNABLE_STATUSES } from "@contracts/workflow";
import { applyTransition, findRequest, logEvent } from "./lib/workflow";

export const techRouter = createRouter({
  /** Admin: list technician accounts */
  list: specialistQuery.query(async () => {
    return getDb()
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.role, "technician"));
  }),

  /** Admin: make a signed-in customer account a technician, by email */
  addByEmail: specialistQuery
    .input(z.object({ email: z.string().trim().toLowerCase().email() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const user = await db.query.users.findFirst({ where: eq(users.email, input.email) });
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No account with this email — ask them to sign in once first",
        });
      }
      if (user.role === "specialist") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This account is a specialist" });
      }
      await db.update(users).set({ role: "technician" }).where(eq(users.id, user.id));
      return { ok: true, name: user.name };
    }),

  /** Admin: turn a technician back into a regular account (no active jobs allowed) */
  remove: specialistQuery
    .input(z.object({ technicianId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [active] = await db
        .select({ id: serviceRequests.id })
        .from(serviceRequests)
        .where(
          and(
            eq(serviceRequests.technicianId, input.technicianId),
            inArray(serviceRequests.status, [...ACTIVE_JOB_STATUSES]),
          ),
        )
        .limit(1);
      if (active) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Reassign job #${active.id} before removing this technician`,
        });
      }
      await db
        .update(users)
        .set({ role: "customer" })
        .where(and(eq(users.id, input.technicianId), eq(users.role, "technician")));
      return { ok: true };
    }),

  /** Admin: assign a technician — only once the customer has approved the quote */
  assign: specialistQuery
    .input(z.object({ requestId: z.number().int(), technicianId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const tech = await db.query.users.findFirst({ where: eq(users.id, input.technicianId) });
      if (!tech || tech.role !== "technician") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Not a technician" });
      }
      await db.transaction(async (tx) => {
        const job = await findRequest(tx, input.requestId, "any", true);
        if (!ASSIGNABLE_STATUSES.includes(job.status)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A technician can be assigned once the customer approves the quote",
          });
        }
        await tx
          .update(serviceRequests)
          .set({ technicianId: tech.id })
          .where(eq(serviceRequests.id, job.id));
        await logEvent(tx, job.id, "assigned", ctx.user.id, `Technician: ${tech.name ?? tech.email ?? tech.id}`);
      });
      return { ok: true };
    }),

  /** Technician: my assigned jobs, with the photos the customer uploaded */
  myJobs: technicianQuery.query(async ({ ctx }) => {
    const db = getDb();
    const jobs = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.technicianId, ctx.user.id))
      .orderBy(desc(serviceRequests.createdAt));
    const media = jobs.length
      ? await db
          .select()
          .from(requestMedia)
          .where(inArray(requestMedia.requestId, jobs.map((j) => j.id)))
      : [];
    return jobs.map((job) => ({ ...job, media: media.filter((m) => m.requestId === job.id) }));
  }),

  /** Technician: field events — arrived / start work / complete */
  fieldEvent: technicianQuery
    .input(
      z.object({
        requestId: z.number().int(),
        action: z.enum(["arrived", "start", "complete"]),
        note: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
        const scope = { technicianId: ctx.user.id };
      if (input.action === "arrived") {
        const job = await findRequest(getDb(), input.requestId, scope);
        if (job.status !== "scheduled") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Job is not scheduled" });
        }
        await logEvent(getDb(), job.id, "arrived", ctx.user.id, input.note);
      } else {
        await applyTransition({
          id: input.requestId,
          name: input.action === "start" ? "startWork" : "complete",
          actorId: ctx.user.id,
          scope,
          note: input.note,
        });
      }
      return { ok: true };
    }),

  /** Technician: report current position for an active job */
  reportLocation: technicianQuery
    .input(
      z.object({
        requestId: z.number().int(),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        accuracy: z.number().nonnegative().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
        const db = getDb();
      const job = await findRequest(db, input.requestId, { technicianId: ctx.user.id });
      if (!ACTIVE_JOB_STATUSES.includes(job.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Job is not active" });
      }
      const values = {
        requestId: job.id,
        technicianId: ctx.user.id,
        lat: String(input.lat),
        lng: String(input.lng),
        accuracy: input.accuracy != null ? String(Math.round(input.accuracy)) : null,
        updatedAt: new Date(),
      };
      await db
        .insert(technicianLocations)
        .values(values)
        .onConflictDoUpdate({ target: technicianLocations.requestId, set: values });
      return { ok: true };
    }),
});
