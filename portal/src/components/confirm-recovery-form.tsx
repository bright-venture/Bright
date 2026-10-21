"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { recoveryLinkFromUrl, type RecoveryLink } from "@/lib/auth/recovery-link";
import { recoveryFailureDetails } from "@/lib/auth/recovery-error";

export function ConfirmRecoveryForm() {
  const initialized = useRef(false);
  const token = useRef<RecoveryLink | null>(null);
  const inFlight = useRef(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [supportCode, setSupportCode] = useState("");

  useEffect(() => {
    // Preserve the token across Strict Mode effect replays, in memory only.
    if (initialized.current) return;
    initialized.current = true;
    token.current = recoveryLinkFromUrl(window.location.hash, window.location.search);
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const providerError = fragment.get("error_code") ?? query.get("error_code");
    window.history.replaceState(null, "", window.location.pathname);
    if (providerError) {
      const details = recoveryFailureDetails({ code: providerError }, "link");
      setError(details.message); setSupportCode(details.supportCode);
    } else if (!token.current) {
      setError("This page needs the complete link from your recovery email. If you just opened a fresh email, share the support code below before requesting another.");
      setSupportCode("link/missing_or_invalid_parameters");
    }
    setReady(true);
  }, []);

  async function confirm() {
    if (!token.current || inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError(""); setSupportCode("");
    try {
      // The URL has been cleared before creating the shared cookie client,
      // preventing automatic URL detection from racing manual verification.
      const auth = createClient().auth;
      const link = token.current;
      const { data, error } = link.kind === "session"
        ? await auth.setSession({ access_token: link.access_token, refresh_token: link.refresh_token })
        : link.kind === "code"
          ? await auth.exchangeCodeForSession(link.code)
          : await auth.verifyOtp({ token_hash: link.token, type: "recovery" });
      if (error || !data.session) {
        const details = recoveryFailureDetails(error, link.kind);
        setError(details.message); setSupportCode(details.supportCode);
        if (!details.retryable) token.current = null;
        return;
      }
      token.current = null;
      window.location.replace("/auth/update-password");
    } catch {
      setError("Could not reach the recovery service. Check your connection, then try Continue again.");
      setSupportCode(`${token.current?.kind ?? "link"}/client_exception`);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <>
    <p className="auth-intro">Continue to verify your recovery link and choose a new password.</p>
    {error && <div role="alert" className="auth-error"><p>{error}</p>{supportCode && <p className="auth-support-code">Support code: {supportCode}</p>}</div>}
    <button type="button" className="button button-dark auth-submit" onClick={confirm} disabled={!ready || !token.current || busy}>{busy ? "Verifying link…" : "Continue to new password"}</button>
    <p className="auth-help"><Link href="/auth/forgot-password" className="text-link">Request a new recovery email</Link></p>
  </>;
}
