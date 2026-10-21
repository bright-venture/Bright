"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/auth/update-password/actions";
import { SignOutButton } from "./sign-out-button";

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, { saved: false, error: "" });
  if (state.saved) return <div className="auth-success" role="status"><p>Your password has been changed.</p>{state.error ? <><p>{state.error}</p><SignOutButton /></> : <p><a href="/login" className="text-link">Sign in with your new password</a></p>}</div>;
  return <form className="auth-form" action={action}>
    <label htmlFor="new-password">New password</label>
    <input id="new-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={pending} aria-describedby="password-help" />
    <p className="auth-help" id="password-help">Use at least 12 characters and a password you do not use elsewhere.</p>
    <label htmlFor="confirm-password">Confirm new password</label>
    <input id="confirm-password" name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={pending} />
    {state.error && <p role="alert" className="auth-error">{state.error}</p>}
    <button className="button button-dark auth-submit" disabled={pending}>{pending ? "Saving password…" : "Save new password"}</button>
  </form>;
}
