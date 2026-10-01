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

/** A signed-up account; by default it accepted the Terms at sign-up, like the real form. */
export async function makeUser(email: string, name = email.split("@")[0], { acceptedTerms = true } = {}) {
  const { findOrCreateUser } = await import("../queries/users");
  return findOrCreateUser({
    authId: randomUUID(),
    email,
    name,
    termsVersion: acceptedTerms ? "test-version" : null,
  });
}

/** A pin in Achrafieh, Beirut. */
export const BEIRUT_PIN = { lat: 33.8886, lng: 35.5195 };

/** Keys shaped like real uploaded application documents. */
export function documentKeys() {
  const key = (kind: string) => `applications/${randomUUID()}/${kind}-file.jpg`;
  return { idDocumentKey: key("idDocument"), criminalRecordKey: key("criminalRecord"), photoKey: key("photo") };
}

/**
 * Storage stub for tests: keeps the real key rules (prefixes, kind tags) and
 * replaces everything that would talk to Supabase.
 */
export async function storageStub(importOriginal: () => Promise<unknown>) {
  const real = (await importOriginal()) as typeof import("../lib/storage");
  return {
    ...real,
    createUploadUrl: async (authId: string, fileName: string) => ({
      key: `requests/${authId}/x-${fileName}`,
      token: "token",
      bucket: "media",
    }),
    createSignedUrls: async (keys: string[]) => Object.fromEntries(keys.map((k) => [k, `https://signed/${k}`])),
    createDocumentUploadUrl: async (kind: string, fileName: string) => ({
      key: `applications/${randomUUID()}/${kind}-${fileName}`,
      token: "token",
      bucket: "docs",
    }),
    // A key containing "missing" stands for a file that was never uploaded.
    documentsExist: async (keys: string[]) => keys.every((k) => !k.includes("missing")),
    createDocumentUrls: async (keys: string[]) => Object.fromEntries(keys.map((k) => [k, `https://signed/${k}`])),
    profilePhotoUrl: async (key: string | null | undefined) => (key ? `https://signed/${key}` : null),
    deleteDocuments: async (keys: string[]) => {
      deletedDocuments.push(...keys);
    },
  };
}

/** Document keys "deleted" through the storage stub, for assertions. */
export const deletedDocuments: string[] = [];

/** A valid visit date: 30 days from now, as YYYY-MM-DD. */
export function futureDate(days = 30) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}
