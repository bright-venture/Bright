import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { technicianApplications } from "../db/schema";
import { CATEGORIES } from "../contracts/services";

const TRADE_IDS = CATEGORIES.map(c => c.id) as [string, ...string[]];

export const joinRouter = createRouter({
  // Public — technicians apply without an account.
  submit: publicQuery
    .input(
      z.object({
        name: z.string().trim().min(2).max(255),
        phone: z.string().trim().min(6).max(64),
        trade: z.enum(TRADE_IDS),
        area: z.string().trim().min(2).max(255),
        notes: z.string().trim().max(2000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [res] = await db
        .insert(technicianApplications)
        .values({
          name: input.name,
          phone: input.phone,
          trade: input.trade,
          area: input.area,
          notes: input.notes ?? null,
        })
        .returning({ id: technicianApplications.id });
      return { id: res.id };
    }),

  list: adminQuery.query(async () => {
    const db = getDb();
    return db
      .select()
      .from(technicianApplications)
      .orderBy(desc(technicianApplications.createdAt));
  }),

  setStatus: adminQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(["new", "contacted", "hired", "rejected"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(technicianApplications)
        .set({ status: input.status })
        .where(eq(technicianApplications.id, input.id));
      return { ok: true };
    }),
});
