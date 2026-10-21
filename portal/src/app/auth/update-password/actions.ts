"use server";

import { requireEmployee } from "@/lib/auth/employee";

export type PasswordResult = { saved: boolean; error: string };

export async function updatePassword(_previous: PasswordResult, fields: FormData): Promise<PasswordResult> {
  // Recheck identity and membership on every mutation, not only the page load.
  const { supabase, claims } = await requireEmployee(false);
  const password = fields.get("password");
  const confirmation = fields.get("confirmation");
  if (typeof password !== "string" || password.length < 12 || password.length > 128) {
    return { saved: false, error: "Choose a password between 12 and 128 characters." };
  }
  if (password !== confirmation) return { saved: false, error: "The two passwords do not match." };

  try {
    const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors();
    if (factorError) return { saved: false, error: "Could not check your account security. Please try again." };
    if (factors.all.some(factor => factor.status === "verified") && claims.aal !== "aal2") {
      return { saved: false, error: "Verify your authenticator before changing your password. Reload this page to continue." };
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      if (error.code === "same_password") return { saved: false, error: "Choose a different password from your current password." };
      if (error.code === "weak_password") return { saved: false, error: "That password does not meet the account requirements. Choose a longer, unique password." };
      if (error.code === "reauthentication_needed") return { saved: false, error: "Please request a fresh recovery email and try again." };
      return { saved: false, error: "Your password could not be changed. Request a fresh recovery link or contact your administrator." };
    }
  } catch { return { saved: false, error: "Could not reach the password service. Please try signing in with your new password before requesting another reset." }; }

  // Password update succeeded. Never report it as failed if sign-out then fails.
  try {
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) throw error;
    return { saved: true, error: "" };
  } catch {
    return { saved: true, error: "Your password was changed, but we could not finish signing out. Please sign out below before signing in again." };
  }
}
