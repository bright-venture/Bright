import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let instance: SupabaseClient | undefined;

/** Server-only client using the service-role key. Never expose this key to the browser. */
export function getSupabaseAdmin() {
  if (!instance) {
    instance = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return instance;
}
