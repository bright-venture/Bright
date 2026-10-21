import "server-only";
import { tryAdminClient } from "@/lib/supabase/admin";
import type { Employee, PortalRole } from "./admin-types";

// Loads the full employee roster (membership joined with Auth email/last sign-in).
// Callers MUST already have confirmed the viewer is an admin. Returns [] when the
// service-role key is not configured, so the portal still renders.
export async function getEmployees(): Promise<Employee[]> {
  const admin = tryAdminClient();
  if (!admin) return [];
  try {
    const [membersResult, usersResult] = await Promise.all([
      admin.from("portal_members").select("user_id, display_name, role, active, created_at").order("created_at"),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ]);
    const users = new Map((usersResult.data?.users ?? []).map(user => [user.id, user]));
    return (membersResult.data ?? []).map(member => {
      const user = users.get(member.user_id);
      return {
        userId: member.user_id,
        email: user?.email ?? "",
        displayName: member.display_name,
        role: member.role as PortalRole,
        active: member.active,
        lastSignInAt: user?.last_sign_in_at ?? null,
        createdAt: member.created_at,
      };
    });
  } catch {
    return [];
  }
}
