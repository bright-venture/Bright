"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/employee";
import { tryAdminClient } from "@/lib/supabase/admin";
import type { AdminResult, PortalRole } from "./admin-types";

const NOT_CONFIGURED = "Server admin access is not configured. Add SUPABASE_SERVICE_ROLE_KEY.";

function cleanName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  return name.length >= 1 && name.length <= 120 ? name : null;
}

function cleanEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function cleanId(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

function asRole(value: unknown): PortalRole | null {
  return value === "admin" || value === "staff" ? value : null;
}

// Sends a set-password email through the configured sender (Resend), reusing the
// proven recovery flow. Best-effort: a send failure does not fail the invite.
async function sendSetPasswordEmail(email: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url || !key || !site) return;
  const mailer = createClient(url, key, { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false } });
  await mailer.auth.resetPasswordForEmail(email, { redirectTo: new URL("/auth/callback", site).href }).catch(() => {});
}

export async function inviteEmployee(input: { email: string; displayName: string; role: string }): Promise<AdminResult> {
  await requireAdmin();
  const email = cleanEmail(input.email);
  const displayName = cleanName(input.displayName);
  const role = asRole(input.role);
  if (!email) return { ok: false, error: "Enter a valid email address." };
  if (!displayName) return { ok: false, error: "Enter a name between 1 and 120 characters." };
  if (!role) return { ok: false, error: "Choose a role." };

  const admin = tryAdminClient();
  if (!admin) return { ok: false, error: NOT_CONFIGURED };

  const { data: created, error: createError } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (createError || !created?.user) {
    if (/registered|already|exists/i.test(createError?.message ?? "")) return { ok: false, error: "An account with that email already exists." };
    return { ok: false, error: "Could not create the account. Please try again." };
  }

  const { error: memberError } = await admin.from("portal_members").insert({ user_id: created.user.id, display_name: displayName, role, active: true });
  if (memberError) {
    // Roll back the Auth user so we never leave an orphaned account.
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
    return { ok: false, error: "Could not add the employee. Please try again." };
  }

  await sendSetPasswordEmail(email);
  revalidatePath("/portal");
  return { ok: true };
}

export async function setEmployeeActive(input: { userId: string; active: boolean }): Promise<AdminResult> {
  const { claims } = await requireAdmin();
  const userId = cleanId(input.userId);
  if (!userId) return { ok: false, error: "Invalid employee." };
  const active = Boolean(input.active);
  if (userId === claims.sub && !active) return { ok: false, error: "You cannot deactivate your own account." };

  const admin = tryAdminClient();
  if (!admin) return { ok: false, error: NOT_CONFIGURED };

  if (!active) {
    const { data: target } = await admin.from("portal_members").select("role").eq("user_id", userId).maybeSingle();
    if (target?.role === "admin" && !(await hasAnotherActiveAdmin(admin, userId))) {
      return { ok: false, error: "At least one active admin is required." };
    }
  }

  const { error } = await admin.from("portal_members").update({ active }).eq("user_id", userId);
  if (error) return { ok: false, error: "Could not update the employee. Please try again." };
  revalidatePath("/portal");
  return { ok: true };
}

export async function setEmployeeRole(input: { userId: string; role: string }): Promise<AdminResult> {
  const { claims } = await requireAdmin();
  const userId = cleanId(input.userId);
  const role = asRole(input.role);
  if (!userId) return { ok: false, error: "Invalid employee." };
  if (!role) return { ok: false, error: "Choose a valid role." };
  if (userId === claims.sub && role !== "admin") return { ok: false, error: "You cannot remove your own admin role." };

  const admin = tryAdminClient();
  if (!admin) return { ok: false, error: NOT_CONFIGURED };

  if (role === "staff") {
    const { data: target } = await admin.from("portal_members").select("role, active").eq("user_id", userId).maybeSingle();
    if (target?.role === "admin" && target.active && !(await hasAnotherActiveAdmin(admin, userId))) {
      return { ok: false, error: "At least one active admin is required." };
    }
  }

  const { error } = await admin.from("portal_members").update({ role }).eq("user_id", userId);
  if (error) return { ok: false, error: "Could not update the role. Please try again." };
  revalidatePath("/portal");
  return { ok: true };
}

// Permanently removes an account. Deleting the Auth user cascades to the
// portal_members row (on delete cascade). Irreversible; the console confirms first.
export async function removeEmployee(input: { userId: string }): Promise<AdminResult> {
  const { claims } = await requireAdmin();
  const userId = cleanId(input.userId);
  if (!userId) return { ok: false, error: "Invalid employee." };
  if (userId === claims.sub) return { ok: false, error: "You cannot remove your own account." };

  const admin = tryAdminClient();
  if (!admin) return { ok: false, error: NOT_CONFIGURED };

  const { data: target } = await admin.from("portal_members").select("role, active").eq("user_id", userId).maybeSingle();
  if (target?.role === "admin" && target.active && !(await hasAnotherActiveAdmin(admin, userId))) {
    return { ok: false, error: "At least one active admin is required." };
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: "Could not remove the account. Please try again." };
  revalidatePath("/portal");
  return { ok: true };
}

async function hasAnotherActiveAdmin(admin: SupabaseClient, exceptUserId: string): Promise<boolean> {
  const { count } = await admin
    .from("portal_members")
    .select("user_id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("active", true)
    .neq("user_id", exceptUserId);
  return (count ?? 0) > 0;
}
