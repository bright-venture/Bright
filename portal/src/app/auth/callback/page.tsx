import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { ConfirmRecoveryForm } from "@/components/confirm-recovery-form";

export const metadata: Metadata = { title: "Confirm password recovery", robots: { index: false, follow: false } };

export default function RecoveryCallbackPage() {
  return <AuthShell><p className="eyebrow">ACCOUNT RECOVERY</p><h1>Reset your password.</h1><ConfirmRecoveryForm /></AuthShell>;
}
