import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireEmployee } from "@/lib/auth/employee";
import { safeNext } from "@/lib/auth/next";
import { AuthShell } from "@/components/auth-shell";
import { MfaForm } from "@/components/mfa-form";

export const metadata: Metadata = { title: "Verify your sign in", robots: { index: false, follow: false } };
export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  // Where the user was headed (e.g. a scanned machine QR), validated to in-app paths.
  const next = safeNext((await searchParams).next) ?? "/portal";
  const { claims } = await requireEmployee(false, next);
  if (claims.aal === "aal2") redirect(next);
  return <AuthShell><p className="eyebrow">SECURE EMPLOYEE ACCESS</p><h1>One more step.</h1><MfaForm returnTo={next} /></AuthShell>;
}
