import { and, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { technicianApplications } from "@db/schema";
import { REJECTED_APPLICATION_RETENTION_DAYS } from "@contracts/legal";
import { getDb } from "../queries/connection";
import { deleteDocuments } from "../lib/storage";

/**
 * Privacy Policy: documents of rejected applicants are deleted
 * REJECTED_APPLICATION_RETENTION_DAYS after rejection. Applications rejected
 * before rejection dates were recorded count from when they were submitted.
 * Safe to run repeatedly; each application is only purged once.
 */
export async function purgeRejectedDocuments({ now = new Date(), dryRun = false } = {}) {
  const db = getDb();
  const cutoff = new Date(now.getTime() - REJECTED_APPLICATION_RETENTION_DAYS * 86_400_000);
  const due = await db
    .select({
      id: technicianApplications.id,
      idDocumentKey: technicianApplications.idDocumentKey,
      criminalRecordKey: technicianApplications.criminalRecordKey,
      photoKey: technicianApplications.photoKey,
    })
    .from(technicianApplications)
    .where(
      and(
        eq(technicianApplications.status, "rejected"),
        isNull(technicianApplications.documentsDeletedAt),
        // ISO string + cast: the production driver can't bind a Date inside raw SQL.
        sql`coalesce(${technicianApplications.rejectedAt}, ${technicianApplications.createdAt}) < ${cutoff.toISOString()}::timestamptz`,
        or(
          isNotNull(technicianApplications.idDocumentKey),
          isNotNull(technicianApplications.criminalRecordKey),
          isNotNull(technicianApplications.photoKey),
        ),
      ),
    );

  const keys = due.flatMap((a) => [a.idDocumentKey, a.criminalRecordKey, a.photoKey]).filter((k): k is string => !!k);
  if (!dryRun && due.length) {
    // Files first: if storage fails, the rows still point at them and the next run retries.
    await deleteDocuments(keys);
    await db
      .update(technicianApplications)
      .set({ idDocumentKey: null, criminalRecordKey: null, photoKey: null, documentsDeletedAt: now })
      .where(inArray(technicianApplications.id, due.map((a) => a.id)));
  }
  const legacy = await purgeCriminalRecords({ dryRun });
  return { applications: due.length, files: keys.length, criminalRecords: legacy, dryRun, cutoff: cutoff.toISOString() };
}

/**
 * Criminal records are no longer collected (or mentioned in the Privacy Policy),
 * so any uploaded before that are deleted whatever the application's status.
 */
async function purgeCriminalRecords({ dryRun }: { dryRun: boolean }) {
  const db = getDb();
  const rows = await db
    .select({ id: technicianApplications.id, key: technicianApplications.criminalRecordKey })
    .from(technicianApplications)
    .where(isNotNull(technicianApplications.criminalRecordKey));
  if (!dryRun && rows.length) {
    await deleteDocuments(rows.map((r) => r.key!));
    await db
      .update(technicianApplications)
      .set({ criminalRecordKey: null })
      .where(inArray(technicianApplications.id, rows.map((r) => r.id)));
  }
  return rows.length;
}
