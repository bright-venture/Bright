import type { Metadata } from "next";
import { requireEmployee } from "@/lib/auth/employee";
import { getMachine, getMachineReport, getMachineSnapshots } from "@/lib/portal/machine-data";
import { MachineState } from "@/components/machine-state";

export const metadata: Metadata = { title: "Machine report", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function MachinePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  const { id } = await params;
  const validId = /^[0-9a-f-]{36}$/i.test(id);
  // By default (e.g. a scanned QR) this opens a NEW report: saving it becomes the
  // machine's current report, and the previous one stays in Saved versions.
  // "?view=current" (from the portal) opens the current report for editing.
  const viewCurrent = (await searchParams).view === "current";
  const startNew = !viewCurrent;
  // Login + MFA are enforced here, so a scanned QR opens only for signed-in
  // employees; after signing in they come straight back to this page.
  const { supabase, member } = await requireEmployee(true, validId ? `/m/${id}${viewCurrent ? "?view=current" : ""}` : undefined);
  const machine = validId ? await getMachine(supabase, id) : null;

  if (!machine) return <main className="machine-page">
    <div className="machine-card missing">
      <h1>Machine not found</h1>
      <p>This machine may have been removed, or the code is invalid.</p>
      <a className="text-link" href="/portal">Go to the portal</a>
    </div>
  </main>;

  const [report, versions] = await Promise.all([
    getMachineReport(supabase, machine.id),
    getMachineSnapshots(supabase, machine.id),
  ]);
  return <main className="machine-page"><MachineState machine={machine} report={report} versions={versions} defaultTechnician={member.display_name} isAdmin={member.role === "admin"} startNew={startNew} /></main>;
}
