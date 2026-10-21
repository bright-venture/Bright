"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthError } from "@supabase/supabase-js";
import Link from "next/link";

function signInErrorMessage(error: AuthError): string {
  if (error.status === 429) return "Too many attempts. Please wait a few minutes before trying again.";
  if (error.name === "AuthRetryableFetchError" || error.code === "request_timeout") {
    return "We could not reach the sign-in service. Check your connection and try again.";
  }
  if (error.status && error.status >= 500) {
    return "The sign-in service is temporarily unavailable. Please try again later.";
  }
  switch (error.code) {
    case "invalid_credentials":
      return "The email or password is incorrect. Use the password set for your employee account.";
    case "email_not_confirmed":
      return "Your email address has not been confirmed. Contact your administrator to complete account setup.";
    case "user_banned":
      return "This account is disabled. Contact your administrator.";
    case "email_provider_disabled":
      return "Email sign-in is unavailable. Contact your administrator.";
    case "captcha_failed":
      return "The sign-in security check could not be completed. Contact your administrator.";
    default:
      return "Sign-in could not be completed. Please try again or contact your administrator.";
  }
}

export function LoginForm({ next = null }: { next?: string | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [supportCode, setSupportCode] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setSupportCode("");
    const fields = new FormData(event.currentTarget);
    try {
      const { error } = await createClient().auth.signInWithPassword({
        email: String(fields.get("email") ?? "").trim(),
        password: String(fields.get("password") ?? ""),
      });
      if (error) {
        setError(signInErrorMessage(error));
        // Local diagnostics only: never render/log raw errors, credentials, or tokens.
        if (process.env.NODE_ENV === "development") {
          const code = error.code && /^[a-z_]{1,64}$/.test(error.code) ? error.code : "auth_error";
          setSupportCode(`${code}${error.status ? ` (${error.status})` : ""}`);
        }
        setBusy(false); return;
      }
      // Full navigation discards any cached unauthenticated server components.
      // Go where the user was headed (already validated server-side); that page
      // sends them through MFA and back again if needed.
      window.location.assign(next ?? "/portal");
    } catch {
      setError("We could not reach the sign-in service. Check your connection and try again.");
      setBusy(false);
    }
  }
  return <form onSubmit={submit} className="auth-form">
    <label htmlFor="email">Work email</label>
    <input id="email" name="email" type="email" autoComplete="username" required maxLength={254} placeholder="you@company.com" disabled={busy} />
    <label htmlFor="password">Password</label>
    <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={128} disabled={busy} />
    {error && <div className="auth-error" role="alert"><p>{error}</p>{supportCode && <p className="auth-support-code">Support code: {supportCode}</p>}</div>}
    <button className="button button-dark auth-submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    <p className="auth-help"><Link href="/auth/forgot-password" className="text-link">Forgot your password?</Link></p>
    <p className="auth-help">Use the account provided by your Bright administrator. Contact your administrator if you need access.</p>
  </form>;
}
