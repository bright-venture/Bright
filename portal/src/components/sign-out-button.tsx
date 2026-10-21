"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return <div className="sign-out"><button disabled={busy} onClick={async () => {
    setBusy(true); setError(false);
    try {
      const { error } = await createClient().auth.signOut({ scope: "local" });
      if (error) throw error;
      window.location.assign("/login");
    } catch { setError(true); setBusy(false); }
  }}>{busy ? "Signing out…" : "Sign out"}</button>{error && <span role="alert">Could not sign out. Try again.</span>}</div>;
}
