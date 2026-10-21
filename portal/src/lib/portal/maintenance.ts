"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireEmployee } from "@/lib/auth/employee";
import {
  TEMPLATES, MACHINE_MODELS, MAINTENANCE_TYPES, REPORT_STATUSES, CHECK_STATES,
  type MachineModel, type ReportInput, type ReportResult,
} from "./maintenance-templates";

function cleanId(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length >= 1 && text.length <= max ? text : null;
}

function cleanDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

function inList<T extends string>(value: unknown, list: readonly T[]): T | null {
  return typeof value === "string" && (list as readonly string[]).includes(value) ? value as T : null;
}

// Maps the report's machine status to the live badge status shown on the machine.
const LIVE_STATUS: Record<string, "running" | "idle" | "maintenance" | "down"> = {
  operational: "running", needs_maintenance: "maintenance", waiting_parts: "maintenance", out_of_service: "down",
};

// Any approved MFA employee (a technician) edits a machine's single living report.
// Upserts on machine_id: the first save creates the report, later saves update it.
export async function saveMaintenanceReport(input: ReportInput): Promise<ReportResult> {
  const { supabase, member, claims } = await requireEmployee();
  const machineId = cleanId(input.machineId);
  if (!machineId) return { ok: false, error: "Invalid machine." };

  const { data: machine, error: mErr } = await supabase.from("machines").select("id, model").eq("id", machineId).maybeSingle();
  if (mErr) return { ok: false, error: "Could not load the machine." };
  if (!machine) return { ok: false, error: "That machine no longer exists." };
  const model = inList(machine.model, MACHINE_MODELS) as MachineModel | null;
  if (!model) return { ok: false, error: "This machine has no report template. Ask an admin to set its model." };
  const template = TEMPLATES[model];

  // Validate the checklist against the template: keep only known rows with a state or a note.
  const validKeys = new Set(template.checklist.map(item => item.key));
  const checklist: Record<string, { state?: string; note?: string }> = {};
  for (const [key, entry] of Object.entries(input.checklist ?? {})) {
    if (!validKeys.has(key) || !entry) continue;
    const state = inList(entry.state, CHECK_STATES);
    const note = cleanText(entry.note, 300);
    if (!state && !note) continue;
    checklist[key] = { ...(state ? { state } : {}), ...(note ? { note } : {}) };
  }

  const testKeys = new Set(template.functionTests.map(test => test.key));
  const functionTest: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(input.functionTest ?? {})) {
    if (testKeys.has(key) && value === true) functionTest[key] = true;
  }

  const machineStatus = inList(input.machineStatus, REPORT_STATUSES);
  const payload = {
    machine_id: machineId,
    model,
    report_date: cleanDate(input.reportDate) ?? new Date().toISOString().slice(0, 10),
    maintenance_type: inList(input.maintenanceType, MAINTENANCE_TYPES),
    operating_hours: cleanText(input.operatingHours, 40),
    site_location: cleanText(input.siteLocation, 200),
    machine_status: machineStatus,
    problem_found: cleanText(input.problemFound, 4000),
    work_performed: cleanText(input.workPerformed, 4000),
    parts_replaced: cleanText(input.partsReplaced, 4000),
    parts_required: cleanText(input.partsRequired, 4000),
    next_maintenance: input.nextMaintenance ? cleanDate(input.nextMaintenance) : null,
    technician_name: cleanText(input.technicianName, 160) ?? member.display_name,
    checklist,
    function_test: functionTest,
    updated_at: new Date().toISOString(),
    updated_by: claims.sub,
  };

  // Update the machine's existing report, or create it if there is none yet.
  // Avoids relying on ON CONFLICT so it works across migration states, and detects
  // an RLS-blocked update (the edit policy not applied) rather than failing silently.
  const { data: existing } = await supabase.from("maintenance_reports").select("*").eq("machine_id", machineId).maybeSingle();

  // Starting a new report replaces the current one. If the current report has
  // content that was never archived (e.g. saved before versions existed), keep
  // a copy in Saved versions first, stamped with its original save time.
  // A report already linked to its version is archived by definition.
  if (existing && input.archivePrevious && !existing.current_snapshot_id) {
    const hasContent = existing.machine_status || existing.maintenance_type || existing.problem_found || existing.work_performed
      || existing.parts_replaced || Object.keys((existing.checklist as object | null) ?? {}).length > 0;
    const { data: last } = await supabase.from("maintenance_report_snapshots").select("saved_at").eq("machine_id", machineId).order("saved_at", { ascending: false }).limit(1).maybeSingle();
    const archived = last && existing.updated_at && new Date(last.saved_at as string) >= new Date(existing.updated_at as string);
    if (hasContent && !archived) {
      const { error: archiveError } = await supabase.from("maintenance_report_snapshots").insert({
        machine_id: machineId,
        model: existing.model,
        report_date: existing.report_date,
        maintenance_type: existing.maintenance_type,
        operating_hours: existing.operating_hours,
        site_location: existing.site_location,
        machine_status: existing.machine_status,
        problem_found: existing.problem_found,
        work_performed: existing.work_performed,
        parts_replaced: existing.parts_replaced,
        parts_required: existing.parts_required,
        next_maintenance: existing.next_maintenance,
        technician_name: existing.technician_name,
        checklist: existing.checklist,
        function_test: existing.function_test,
        saved_at: existing.updated_at ?? new Date().toISOString(),
        saved_by: existing.updated_by ?? claims.sub,
      });
      // Never overwrite a report we couldn't archive.
      if (archiveError) return { ok: false, error: "Could not archive the current report before starting a new one. Please try again." };
    }
  }

  let reportId: string;
  if (existing) {
    const { data, error } = await supabase.from("maintenance_reports").update(payload).eq("id", existing.id).select("id");
    if (error) return { ok: false, error: "Could not save the report. Please try again." };
    if (!data || data.length === 0) return { ok: false, error: "Saving is not enabled yet. Ask an administrator to apply the latest database update (migration 202609170009)." };
    reportId = existing.id as string;
  } else {
    const { data, error } = await supabase.from("maintenance_reports").insert(payload).select("id").single();
    if (error || !data) return { ok: false, error: "Could not save the report. Please try again." };
    reportId = data.id as string;
  }

  // Version history: one version per report, not per save. Re-saving the current
  // report updates its linked version; a new report (or an unlinked one) gets a
  // new version. Best-effort: the report itself is already saved.
  const version = {
    machine_id: machineId,
    model,
    report_date: payload.report_date,
    maintenance_type: payload.maintenance_type,
    operating_hours: payload.operating_hours,
    site_location: payload.site_location,
    machine_status: payload.machine_status,
    problem_found: payload.problem_found,
    work_performed: payload.work_performed,
    parts_replaced: payload.parts_replaced,
    parts_required: payload.parts_required,
    next_maintenance: payload.next_maintenance,
    technician_name: payload.technician_name,
    checklist,
    function_test: functionTest,
    // Same clock as the report's updated_at, so "already archived?" checks are exact.
    saved_at: payload.updated_at,
    saved_by: claims.sub,
  };
  let currentVersion = !input.archivePrevious ? (existing?.current_snapshot_id as string | null | undefined) : null;
  // Not linked yet (e.g. saved before the link existed): the latest version saved
  // together with the current report is its version, so update that one.
  if (!currentVersion && !input.archivePrevious && existing?.updated_at) {
    const { data: last } = await supabase.from("maintenance_report_snapshots").select("id, saved_at").eq("machine_id", machineId).order("saved_at", { ascending: false }).limit(1).maybeSingle();
    if (last && new Date(last.saved_at as string).getTime() >= new Date(existing.updated_at as string).getTime() - 5000) currentVersion = last.id as string;
  }
  let updatedVersion = false;
  if (currentVersion) {
    const { data } = await supabase.from("maintenance_report_snapshots").update(version).eq("id", currentVersion).select("id");
    updatedVersion = !!data && data.length > 0;
    if (updatedVersion && !existing?.current_snapshot_id) await supabase.from("maintenance_reports").update({ current_snapshot_id: currentVersion }).eq("id", reportId);
    // The version exists but the database refused the update (edit policy not applied):
    // don't add a duplicate version; say what's missing.
    if (!updatedVersion) {
      revalidatePath(`/m/${machineId}`);
      return { ok: false, error: "The report was saved, but its saved version couldn't be updated. Ask an administrator to apply the latest database update (migration 202609170012)." };
    }
  }
  if (!updatedVersion) {
    const { data: created } = await supabase.from("maintenance_report_snapshots").insert(version).select("id").single();
    if (created) await supabase.from("maintenance_reports").update({ current_snapshot_id: created.id }).eq("id", reportId);
  }

  // Keep the machine's live status in sync with the report's outcome.
  const live = machineStatus ? LIVE_STATUS[machineStatus] : null;
  if (live) await supabase.from("machines").update({ status: live, updated_at: new Date().toISOString(), updated_by: claims.sub }).eq("id", machineId);

  revalidatePath(`/m/${machineId}`);
  revalidatePath("/portal");
  return { ok: true };
}

// Deleting a submitted report is admin-only (reports are otherwise immutable).
export async function deleteMaintenanceReport(input: { id: string }): Promise<ReportResult> {
  const { supabase } = await requireAdmin();
  const id = cleanId(input.id);
  if (!id) return { ok: false, error: "Invalid report." };
  const { error } = await supabase.from("maintenance_reports").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete the report. Please try again." };
  revalidatePath("/portal");
  return { ok: true };
}

// Deleting an archived version (snapshot) is admin-only.
export async function deleteReportSnapshot(input: { id: string }): Promise<ReportResult> {
  const { supabase } = await requireAdmin();
  const id = cleanId(input.id);
  if (!id) return { ok: false, error: "Invalid version." };
  const { error } = await supabase.from("maintenance_report_snapshots").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete the version. Please try again." };
  revalidatePath("/portal");
  return { ok: true };
}
