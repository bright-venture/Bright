import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata: Metadata = { title: "Portal access", robots: { index: false, follow: false } };
export default async function AccessPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const unavailable = (await searchParams).reason === "unavailable";
  return <AuthShell><p className="eyebrow">EMPLOYEE PORTAL</p><h1>{unavailable ? "Access is unavailable." : "Access needs approval."}</h1><p className="auth-intro">{unavailable ? "We could not check your portal access. Please try again later or contact your administrator." : "Your account has not been enabled for this workspace. Ask your Bright administrator to activate your access."}</p><SignOutButton /></AuthShell>;
}
