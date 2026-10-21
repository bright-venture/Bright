import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role client. It BYPASSES row-level security, so it may only be used
// inside admin-gated server code (after requireAdmin). Never import from client code.
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Returns null instead of throwing when the service-role key is absent, so the
// portal still renders (admins just see an empty list and a clear error on write).
export function tryAdminClient(): SupabaseClient | null {
  try { return createAdminClient(); } catch { return null; }
}
