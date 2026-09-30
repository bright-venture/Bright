// Test harness: runs the real tRPC router against an in-memory Postgres (PGlite)
// migrated with the same SQL as production. Storage and env are stubbed.
import { randomUUID } from "node:crypto";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@db/schema";
import * as relations from "@db/relations";
import type { User } from "@db/schema";

export const ADMIN_EMAIL = "specialist@example.com";

export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema: { ...schema, ...relations } });
  await migrate(db, { migrationsFolder: path.resolve(import.meta.dirname, "../../db/migrations") });
  return db;
}

export type TestDb = Awaited<ReturnType<typeof createTestDb>>;

export async function callerFor(user?: User) {
  const { appRouter } = await import("../router");
  return appRouter.createCaller({
    req: new Request("http://test.local"),
    resHeaders: new Headers(),
    user,
  });
}

export async function makeUser(email: string, name = email.split("@")[0]) {
  const { findOrCreateUser } = await import("../queries/users");
  return findOrCreateUser({ authId: randomUUID(), email, name });
}

/** A valid visit date: 30 days from now, as YYYY-MM-DD. */
export function futureDate(days = 30) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}
