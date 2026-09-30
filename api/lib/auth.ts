import { getSupabaseAdmin } from "./supabase";
import { findOrCreateUser } from "../queries/users";

function bearerToken(headers: Headers): string | null {
  const header = headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1] : null;
}

/**
 * Verifies the Supabase access token sent by the browser and returns the
 * matching app user (created on first sign-in). Returns undefined when the
 * request is anonymous or the token is invalid.
 */
export async function authenticateRequest(headers: Headers) {
  const token = bearerToken(headers);
  if (!token) return undefined;

  const { data, error } = await getSupabaseAdmin().auth.getClaims(token);
  if (error || !data?.claims?.sub) return undefined;

  const claims = data.claims;
  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    null;

  return findOrCreateUser({
    authId: claims.sub,
    email: typeof claims.email === "string" && claims.email ? claims.email : null,
    name,
  });
}
