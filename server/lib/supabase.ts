import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let instance: SupabaseClient | undefined;

/** Server-only client using the service-role key. Never expose this key to the browser. */
export function getSupabaseAdmin() {
  if (!instance) {
    // Fail with a readable message (visible in the host's function logs) instead of a bare 500.
    const missing = [
      !env.supabaseUrl && "SUPABASE_URL",
      !env.supabaseServiceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
    ].filter(Boolean);
    if (missing.length) {
      throw new Error(`Server is missing environment variable(s): ${missing.join(", ")}`);
    }
    instance = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return instance;
}
