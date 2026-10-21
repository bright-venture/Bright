import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Recovery link unavailable", robots: { index: false, follow: false } };

export default function RecoveryErrorPage() {
  return <AuthShell><p className="eyebrow">ACCOUNT RECOVERY</p><h1>We couldn’t verify this link.</h1><p className="auth-intro">The link may have expired, already been used, or opened in a different browser from the one that requested it.</p><p className="auth-help">Use the newest recovery email. Older emails may require the original browser. If email requests are temporarily limited, wait before requesting another.</p><Link href="/auth/forgot-password" className="button button-dark auth-submit">Request a new recovery email</Link><p className="auth-help"><Link href="/login" className="text-link">Back to sign in</Link></p></AuthShell>;
}
