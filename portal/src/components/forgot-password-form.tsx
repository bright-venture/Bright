"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createRecoveryRequestClient } from "@/lib/supabase/recovery";

export function ForgotPasswordForm({ linkFailed = false }: { linkFailed?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [error, setError] = useState(linkFailed ? "This recovery link could not be verified. Request a new link, then open it in the same browser and on the same device." : "");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || sent || rateLimited) return;
    const fields = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const site = process.env.NEXT_PUBLIC_SITE_URL;
      if (!site || new URL(site).origin !== window.location.origin) {
        setError("Please open this page using your company's configured website address before requesting a reset.");
        return;
      }
      const { error } = await createRecoveryRequestClient().auth.resetPasswordForEmail(String(fields.get("email") ?? "").trim(), {
        redirectTo: new URL("/auth/callback", site).href,
      });
      if (error) {
        if (error.status === 429 || error.code === "over_email_send_rate_limit") {
          setRateLimited(true);
          setError("Supabase has temporarily limited recovery emails. Wait for the limit to reset, then reload this page to try again. Repeated requests will not help; the default email sender has a project-wide hourly limit.");
        }
        else if (error.code === "email_address_not_authorized") setError("Email delivery is not configured for this address. Your administrator needs to configure the project's email sender.");
        else setError("We could not request a recovery email. Try again later or contact your administrator.");
        return;
      }
      setSent(true);
    } catch { setError("Could not reach the recovery service. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  return <>
    {sent ? <div className="auth-success" role="status"><p>If an account exists for that address, a recovery email will be sent.</p><p>Check your inbox and spam folder. Open the newest email and select Reset password, then Continue to new password. During local development, open the link on the computer running the portal.</p></div> : <form className="auth-form" onSubmit={submit}>
      <label htmlFor="recovery-email">Work email</label>
      <input id="recovery-email" name="email" type="email" autoComplete="email" required maxLength={254} disabled={busy} />
      {error && <p role="alert" className="auth-error">{error}</p>}
      <button className="button button-dark auth-submit" disabled={busy || rateLimited}>{busy ? "Requesting email…" : rateLimited ? "Email temporarily limited" : "Send recovery email"}</button>
    </form>}
    <p className="auth-help"><Link href="/login" className="text-link">Back to sign in</Link></p>
  </>;
}
