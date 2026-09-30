import { useState, type FormEvent } from "react";
import { Loader2, Mail } from "lucide-react";
import { useI18n } from "@/i18n";
import { supabase } from "@/lib/supabase";

const INPUT =
  "mt-2 min-h-12 w-full rounded-2xl border-2 border-navy/30 bg-white px-4 font-semibold text-navy placeholder:font-normal placeholder:text-navy/40 focus:border-flame focus:outline-none";

const GOOGLE_ENABLED = import.meta.env.VITE_AUTH_GOOGLE === "true";

/**
 * Passwordless sign-in: emails a magic link (which returns to `redirectTo`) and also
 * accepts the one-time code from that email, so the user can finish without leaving the page.
 */
export function EmailSignIn({
  redirectTo,
  sendLabel,
}: {
  redirectTo: string;
  sendLabel?: string;
}) {
  const { t, p } = useI18n();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectTo,
        data: name.trim() ? { full_name: name.trim() } : undefined,
      },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (error) setError(error.message);
  }

  async function signInWithGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) setError(error.message);
  }

  return (
    <div>
      {!sent ? (
        <form onSubmit={sendLink} className="space-y-4">
          <div>
            <label className="font-display text-base font-extrabold text-navy">
              {p(t.login.email)}
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={INPUT}
            />
          </div>
          <div>
            <label className="font-display text-base font-extrabold text-navy">
              {p(t.login.name)}
            </label>
            <input
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={p(t.login.namePh)}
              className={INPUT}
            />
          </div>
          <button type="submit" disabled={busy} className="btn-pill-primary w-full text-base">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {sendLabel ?? p(t.login.sendLink)}
          </button>
          {GOOGLE_ENABLED && (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="btn-pill-outline w-full text-base"
            >
              {p(t.login.google)}
            </button>
          )}
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-4">
          <p className="text-sm leading-relaxed text-navy/70">{p(t.login.checkEmail)}</p>
          <div>
            <label className="font-display text-base font-extrabold text-navy">
              {p(t.login.code)}
            </label>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="123456"
              className={`${INPUT} text-center tracking-[0.4em]`}
            />
          </div>
          <button
            type="submit"
            disabled={busy || code.length < 6}
            className="btn-pill-primary w-full text-base"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {p(t.login.verify)}
          </button>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setCode("");
            }}
            className="w-full text-sm font-bold text-navy/70 underline underline-offset-4 hover:text-navy"
          >
            {p(t.login.useOtherEmail)}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-4 text-center text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
