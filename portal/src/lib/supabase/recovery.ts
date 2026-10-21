"use client";

import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";

export function createRecoveryRequestClient() {
  const { url, key } = supabaseConfig();
  // Only the email request uses implicit flow, so default-template links work
  // across browsers. This isolated client never reads or persists a session.
  return createClient(url, key, {
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "bright-portal-recovery-request",
    },
  });
}
