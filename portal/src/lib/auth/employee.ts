import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { withNext } from "./next";

// Call this in each protected page, server action, and API handler.
// Never rely on a layout, a browser check, or editable user_metadata for access.
// `returnTo` (pages only) brings the user back here after sign-in and MFA.
export async function requireEmployee(requireMfa = true, returnTo?: string) {
  const supabase = await createClient();
  const verified = await supabase.auth.getClaims().catch(() => null);
  if (!verified || verified.error || !verified.data?.claims?.sub) redirect(withNext("/login", returnTo));
  const claims = verified.data.claims;
  const { data: member, error } = await supabase
    .from("portal_members")
    .select("user_id, display_name, role, active")
    .eq("user_id", claims.sub)
    .maybeSingle();

  if (error) redirect("/auth/access?reason=unavailable");
  if (!member?.active || (member.role !== "admin" && member.role !== "staff")) redirect("/auth/access");
  if (requireMfa && claims.aal !== "aal2") redirect(withNext("/auth/mfa", returnTo));
  return { supabase, member, claims };
}

// For admin-only surfaces (the Administration console and its mutations).
// Call this in every admin page and server action; role is checked server-side.
export async function requireAdmin(requireMfa = true) {
  const result = await requireEmployee(requireMfa);
  if (result.member.role !== "admin") redirect("/auth/access");
  return result;
}
