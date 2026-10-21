"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { SignOutButton } from "./sign-out-button";
import { Select } from "./select";

type TotpSetup = { qr: string; secret: string };
export function MfaForm({ returnTo = "/portal", allowEnrollment = true }: { returnTo?: string; allowEnrollment?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [factorId, setFactorId] = useState("");
  const [factors, setFactors] = useState<{ id: string; friendly_name?: string }[]>([]);
  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError("");
    createClient().auth.mfa.listFactors().then(({ data, error }) => {
      if (cancelled) return;
      if (error) { setError("Could not load your authenticator. Please try again."); return; }
      setFactors(data.totp);
      setFactorId(data.totp[0]?.id ?? "");
    }).catch(() => { if (!cancelled) setError("Could not reach the sign-in service. Please try again."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [retry]);

  async function enroll() {
    setBusy(true); setError("");
    try {
      const supabase = createClient();
      const listed = await supabase.auth.mfa.listFactors();
      if (listed.error) throw listed.error;
      // Only clear incomplete setup attempts, never a verified authenticator.
      for (const factor of listed.data.all.filter(item => item.factor_type === "totp" && item.status === "unverified")) {
        const removed = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (removed.error) throw removed.error;
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Bright portal authenticator", issuer: "Bright Service" });
      if (error) throw error;
      setFactorId(data.id);
      setSetup({ qr: data.totp.qr_code, secret: data.totp.secret });
    } catch { setError("Could not set up your authenticator. Try again or contact your administrator."); }
    finally { setBusy(false); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !/^\d{6}$/.test(code)) return;
    setBusy(true); setError("");
    try {
      const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId, code });
      if (error) {
        setError(error.status === 429 ? "Too many attempts. Wait a moment and try again." : "That code could not be verified. Enter a fresh code from your authenticator.");
        setBusy(false); return;
      }
      setSetup(null); setCode("");
      window.location.assign(returnTo);
    } catch { setError("Could not verify the code. Check your connection and try again."); setBusy(false); }
  }

  return <div className="mfa-content">
    {loading ? <p role="status" className="auth-intro">Checking your authenticator…</p> : <>
      <p className="auth-intro">{factorId && !setup ? "Enter the six-digit code from your authenticator app." : "Protect your account with an authenticator app on your phone."}</p>
      {setup && <div className="mfa-setup"><p>Scan this code with your authenticator app, then enter the code it generates.</p><img src={setup.qr} width={200} height={200} alt="Scan this QR code with your authenticator app" /><details><summary>Cannot scan the code?</summary><p>Enter this setup key manually in your authenticator. Keep it private.</p><code>{setup.secret}</code></details></div>}
      {!factorId && !error && (allowEnrollment ? <button className="button button-dark auth-submit" onClick={enroll} disabled={busy}>{busy ? "Preparing…" : "Set up authenticator"}</button> : <p className="auth-error">No supported authenticator is available. Contact your administrator to recover access.</p>)}
      {factorId && <form className="auth-form" onSubmit={verify}>
        {factors.length > 1 && <><label htmlFor="factor">Authenticator</label><Select id="factor" ariaLabel="Authenticator" value={factorId} onChange={setFactorId} options={factors.map((factor, i) => ({ value: factor.id, label: factor.friendly_name ?? `Authenticator ${i + 1}` }))} /></>}
        <label htmlFor="code">Verification code</label><input id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} minLength={6} required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} disabled={busy} />
        <button className="button button-dark auth-submit" disabled={busy || code.length !== 6}>{busy ? "Verifying…" : "Verify and continue"}</button>
      </form>}
      {error && <p role="alert" className="auth-error">{error}</p>}
      {error && !factorId && <button className="auth-retry" onClick={() => setRetry(value => value + 1)}>Try again</button>}
      <p className="auth-help">Lost access to your authenticator? Contact your administrator to verify your identity and restore access.</p>
    </>}
    <SignOutButton />
  </div>;
}
