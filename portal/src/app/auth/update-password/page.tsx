import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { MfaForm } from "@/components/mfa-form";
import { UpdatePasswordForm } from "@/components/update-password-form";
import { requireEmployee } from "@/lib/auth/employee";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };
export default async function UpdatePasswordPage() {
  const { supabase, claims } = await requireEmployee(false);
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return <AuthShell><h1>Please try again.</h1><p className="auth-intro">We could not check your account security. Reload this page to try again.</p></AuthShell>;
  const needsMfa = claims.aal !== "aal2" && data.all.some(factor => factor.status === "verified");
  return <AuthShell><p className="eyebrow">ACCOUNT RECOVERY</p><h1>{needsMfa ? "Verify your identity." : "Choose a new password."}</h1>{needsMfa ? <MfaForm returnTo="/auth/update-password" allowEnrollment={false} /> : <><p className="auth-intro">Your new password will be used for your employee account.</p><UpdatePasswordForm /></>}</AuthShell>;
}
