import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  requestEvents,
  serviceRequests,
  technicianLocations,
  users,
} from "../db/schema";

function requireTechnician(role: string) {
  if (role !== "technician" && role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Technician access required",
    });
  }
}

async function assignedJob(requestId: number, technicianId: number) {
  const db = getDb();
  const row = await db.query.serviceRequests.findFirst({
    where: and(
      eq(serviceRequests.id, requestId),
      eq(serviceRequests.technicianId, technicianId),
    ),
  });
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Job not assigned to you" });
  }
  return row;
}

export const techRouter = createRouter({
  /** Admin: list technician accounts */
  list: adminQuery.query(async () => {
    const db = getDb();
    return db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.role, "technician"));
  }),

  /** Admin: promote a signed-in user to technician by email */
  addByEmail: adminQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No account with this email — ask them to sign in once first",
        });
      }
      await db
        .update(users)
        .set({ role: "technician" })
        .where(eq(users.id, user.id));
      return { ok: true, name: user.name };
    }),

  /** Admin: assign a technician to a request */
  assign: adminQuery
    .input(
      z.object({
        requestId: z.number().int(),
        technicianId: z.number().int(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const tech = await db.query.users.findFirst({
        where: eq(users.id, input.technicianId),
      });
      if (!tech || tech.role !== "technician") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Not a technician" });
      }
      const job = await db.query.serviceRequests.findFirst({
        where: eq(serviceRequests.id, input.requestId),
      });
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      await db
        .update(serviceRequests)
        .set({ technicianId: input.technicianId })
        .where(eq(serviceRequests.id, input.requestId));
      await db.insert(requestEvents).values({
        requestId: input.requestId,
        status: "assigned",
        note: `Technician: ${tech.name ?? tech.email ?? input.technicianId}`,
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),

  /** Technician: my assigned jobs */
  myJobs: authedQuery.query(async ({ ctx }) => {
    requireTechnician(ctx.user.role);
    const db = getDb();
    return db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.technicianId, ctx.user.id))
      .orderBy(desc(serviceRequests.createdAt));
  }),

  /** Technician: field events — arrived / start work / complete */
  fieldEvent: authedQuery
    .input(
      z.object({
        requestId: z.number().int(),
        action: z.enum(["arrived", "start", "complete"]),
        note: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireTechnician(ctx.user.role);
      const db = getDb();
      const job = await assignedJob(input.requestId, ctx.user.id);

      let status: string;
      let newStatus: "scheduled" | "in_progress" | "completed" | null = null;
      if (input.action === "arrived") {
        if (job.status !== "scheduled")
          throw new TRPCError({ code: "BAD_REQUEST", message: "Job is not scheduled" });
        status = "arrived";
      } else if (input.action === "start") {
        if (!["scheduled"].includes(job.status))
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot start now" });
        status = "in_progress";
        newStatus = "in_progress";
      } else {
        if (job.status !== "in_progress")
          throw new TRPCError({ code: "BAD_REQUEST", message: "Work not in progress" });
        status = "completed";
        newStatus = "completed";
      }

      if (newStatus) {
        await db
          .update(serviceRequests)
          .set({ status: newStatus })
          .where(eq(serviceRequests.id, job.id));
      }
      await db.insert(requestEvents).values({
        requestId: job.id,
        status,
        note: input.note ?? null,
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),

  /** Technician: report current position for an active job */
  reportLocation: authedQuery
    .input(
      z.object({
        requestId: z.number().int(),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        accuracy: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireTechnician(ctx.user.role);
      const job = await assignedJob(input.requestId, ctx.user.id);
      if (!["scheduled", "in_progress"].includes(job.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Job is not active",
        });
      }
      const db = getDb();
      const values = {
        requestId: job.id,
        technicianId: ctx.user.id,
        lat: String(input.lat),
        lng: String(input.lng),
        accuracy: input.accuracy != null ? String(Math.round(input.accuracy)) : null,
      };
      const existing = await db.query.technicianLocations.findFirst({
        where: eq(technicianLocations.requestId, job.id),
      });
      if (existing) {
        await db
          .update(technicianLocations)
          .set(values)
          .where(eq(technicianLocations.requestId, job.id));
      } else {
        await db.insert(technicianLocations).values(values);
      }
      return { ok: true };
    }),
});
