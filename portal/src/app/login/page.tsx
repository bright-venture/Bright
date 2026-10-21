import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { safeNext } from "@/lib/auth/next";

export const metadata: Metadata = { title: "Employee sign in", robots: { index: false, follow: false } };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  // Where the user was headed (e.g. a scanned machine QR), validated to in-app paths.
  const next = safeNext((await searchParams).next);
  return <AuthShell><p className="eyebrow">EMPLOYEE PORTAL</p><h1>Welcome back.</h1><p className="auth-intro">Sign in to your Bright workspace.</p><LoginForm next={next} /></AuthShell>;
}
