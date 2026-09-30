import { randomUUID } from "node:crypto";
import { env } from "./env";
import { getSupabaseAdmin } from "./supabase";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB per file
export const ALLOWED_MIME = ["image/*", "video/*"];
const SIGNED_URL_TTL_SECONDS = 60 * 30;

let bucketReady: Promise<void> | undefined;

/** Creates the private media bucket on first use (idempotent). */
function ensureBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const storage = getSupabaseAdmin().storage;
      const { data } = await storage.getBucket(env.storageBucket);
      if (data) return;
      const { error } = await storage.createBucket(env.storageBucket, {
        public: false,
        fileSizeLimit: MAX_UPLOAD_BYTES,
        allowedMimeTypes: ALLOWED_MIME,
      });
      if (error && !/already exists/i.test(error.message)) throw error;
    })().catch((error) => {
      bucketReady = undefined;
      throw error;
    });
  }
  return bucketReady;
}

/** Every customer upload lives under this prefix; used to verify ownership later. */
export function userUploadPrefix(authId: string) {
  return `requests/${authId}/`;
}

function safeFileName(name: string) {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(-80);
  return cleaned || "file";
}

export async function createUploadUrl(authId: string, fileName: string) {
  await ensureBucket();
  const key = `${userUploadPrefix(authId)}${randomUUID()}-${safeFileName(fileName)}`;
  const { data, error } = await getSupabaseAdmin()
    .storage.from(env.storageBucket)
    .createSignedUploadUrl(key);
  if (error || !data) throw error ?? new Error("Could not create upload URL");
  return { key, token: data.token };
}

export async function createSignedUrls(keys: string[]) {
  if (!keys.length) return {} as Record<string, string>;
  const { data, error } = await getSupabaseAdmin()
    .storage.from(env.storageBucket)
    .createSignedUrls(keys, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}
