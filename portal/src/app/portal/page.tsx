import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PortalWorkspace } from "@/components/portal-workspace";
import { requireEmployee } from "@/lib/auth/employee";
import type { Folder } from "@/lib/portal/folder-types";
import type { PortalRole } from "@/lib/portal/admin-types";
import { getEmployees } from "@/lib/portal/employees";
import { getInventory } from "@/lib/portal/inventory-data";
import { getMachines, getReports, getSnapshots } from "@/lib/portal/machine-data";

export const metadata: Metadata = { title: "Employee portal", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PortalPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const { section } = await searchParams;
  const { supabase, member, claims } = await requireEmployee();
  const role = member.role as PortalRole;
  const [{ data: brands, error: brandsError }, folderResult] = await Promise.all([
    supabase.from("brands").select("id, slug, name").order("name"),
    supabase.from("portal_folders").select("id, module, parent_id, name, brand_id").order("name"),
  ]);
  if (brandsError) redirect("/auth/access?reason=unavailable");
  // Folders are non-fatal: if the portal_folders migration has not been applied
  // yet, the portal still loads and the folder sections simply appear empty.
  const folders = (folderResult.data ?? []) as Folder[];
  // Only admins load the roster; staff never receive it.
  const [employees, inventory, machines, reports, snapshots] = await Promise.all([
    role === "admin" ? getEmployees() : Promise.resolve([]),
    getInventory(supabase),
    getMachines(supabase),
    getReports(supabase),
    getSnapshots(supabase),
  ]);
  return <PortalWorkspace brands={brands ?? []} folders={folders} role={role} currentUserId={claims.sub} employees={employees} inventory={inventory} machines={machines} reports={reports} snapshots={snapshots} initialSection={section} />;
}
