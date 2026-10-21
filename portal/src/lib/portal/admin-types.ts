// Shared types for the Administration console. Kept out of the "use server"
// actions file, which may only export async functions.
export type PortalRole = "admin" | "staff";
export type Employee = {
  userId: string;
  email: string;
  displayName: string;
  role: PortalRole;
  active: boolean;
  lastSignInAt: string | null;
  createdAt: string;
};
export type AdminResult = { ok: boolean; error?: string };
