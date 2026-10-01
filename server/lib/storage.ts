import { randomUUID } from "node:crypto";
import { MAX_DOCUMENT_BYTES, type ApplicationDocument } from "@contracts/applications";
import { env } from "./env";
import { getSupabaseAdmin } from "./supabase";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB per customer photo/video
const SIGNED_URL_TTL_SECONDS = 60 * 30;
/** Identity documents get shorter-lived links than job photos. */
const DOCUMENT_URL_TTL_SECONDS = 60 * 5;

/** Private buckets, created on first use. */
const BUCKETS = {
  media: { name: () => env.storageBucket, fileSizeLimit: MAX_UPLOAD_BYTES, mime: ["image/*", "video/*"] },
  docs: { name: () => env.docsBucket, fileSizeLimit: MAX_DOCUMENT_BYTES, mime: ["image/*", "application/pdf"] },
} as const;
type BucketId = keyof typeof BUCKETS;

const bucketReady: Partial<Record<BucketId, Promise<void>>> = {};

function ensureBucket(id: BucketId) {
  if (!bucketReady[id]) {
    const spec = BUCKETS[id];
    bucketReady[id] = (async () => {
      const storage = getSupabaseAdmin().storage;
      const { data } = await storage.getBucket(spec.name());
      if (data) return;
      const { error } = await storage.createBucket(spec.name(), {
        public: false,
        fileSizeLimit: spec.fileSizeLimit,
        allowedMimeTypes: [...spec.mime],
      });
      if (error && !/already exists/i.test(error.message)) throw error;
    })().catch((error) => {
      delete bucketReady[id];
      throw error;
    });
  }
  return bucketReady[id];
}

function safeFileName(name: string) {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(-80);
  return cleaned || "file";
}

async function signedUploadUrl(id: BucketId, key: string) {
  await ensureBucket(id);
  const { data, error } = await getSupabaseAdmin()
    .storage.from(BUCKETS[id].name())
    .createSignedUploadUrl(key);
  if (error || !data) throw error ?? new Error("Could not create upload URL");
  return { key, token: data.token, bucket: BUCKETS[id].name() };
}

async function signedUrls(id: BucketId, keys: string[], ttl: number) {
  if (!keys.length) return {} as Record<string, string>;
  const { data, error } = await getSupabaseAdmin()
    .storage.from(BUCKETS[id].name())
    .createSignedUrls(keys, ttl);
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}

/* ---------- customer request photos/videos ---------- */

/** Every customer upload lives under this prefix; used to verify ownership later. */
export function userUploadPrefix(authId: string) {
  return `requests/${authId}/`;
}

export function createUploadUrl(authId: string, fileName: string) {
  return signedUploadUrl("media", `${userUploadPrefix(authId)}${randomUUID()}-${safeFileName(fileName)}`);
}

export function createSignedUrls(keys: string[]) {
  return signedUrls("media", keys, SIGNED_URL_TTL_SECONDS);
}

/* ---------- technician application documents ---------- */

/** Application uploads happen before any account exists, so keys are random and kind-tagged. */
export const DOCUMENT_PREFIX = "applications/";

export function documentKeyMatches(key: string, kind: ApplicationDocument) {
  return new RegExp(`^${DOCUMENT_PREFIX}[0-9a-f-]{36}/${kind}-[\\w.-]+$`).test(key);
}

export function createDocumentUploadUrl(kind: ApplicationDocument, fileName: string) {
  return signedUploadUrl("docs", `${DOCUMENT_PREFIX}${randomUUID()}/${kind}-${safeFileName(fileName)}`);
}

/** True only if every key was actually uploaded. */
export async function documentsExist(keys: string[]) {
  const bucket = getSupabaseAdmin().storage.from(env.docsBucket);
  const results = await Promise.all(keys.map((k) => bucket.exists(k)));
  return results.every((r) => r.data === true);
}

export function createDocumentUrls(keys: string[]) {
  return signedUrls("docs", keys, DOCUMENT_URL_TTL_SECONDS);
}

/** Signed link to a technician's profile photo (users.avatar holds its document key). */
export async function profilePhotoUrl(avatarKey: string | null | undefined) {
  if (!avatarKey?.startsWith(DOCUMENT_PREFIX)) return null;
  const urls = await signedUrls("docs", [avatarKey], SIGNED_URL_TTL_SECONDS);
  return urls[avatarKey] ?? null;
}
