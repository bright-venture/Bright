import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata: Metadata = { title: "Recover your account", robots: { index: false, follow: false } };
export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return <AuthShell><p className="eyebrow">ACCOUNT RECOVERY</p><h1>Forgot your password?</h1><p className="auth-intro">Request a recovery link to choose a new password.</p><ForgotPasswordForm linkFailed={reason === "link"} /></AuthShell>;
}
