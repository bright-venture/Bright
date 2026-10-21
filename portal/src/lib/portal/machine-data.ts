import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Machine, MachineStatus } from "./machine-types";
import type { MachineModel, MaintenanceReport, MaintenanceType, ReportStatus, ChecklistEntry, ReportSnapshot } from "./maintenance-templates";

const COLS = "id, name, location, status, notes, updated_at, brand_id, model, asset_tag, documents_folder_id";

function toMachine(row: Record<string, unknown>): Machine {
  return {
    id: row.id as string,
    name: row.name as string,
    location: (row.location as string | null) ?? null,
    status: row.status as MachineStatus,
    notes: (row.notes as string | null) ?? null,
    updatedAt: row.updated_at as string,
    brandId: (row.brand_id as string | null) ?? null,
    model: (row.model as MachineModel | null) ?? null,
    assetTag: (row.asset_tag as string | null) ?? null,
    documentsFolderId: (row.documents_folder_id as string | null) ?? null,
  };
}

// All machines, scoped by the caller's RLS. Non-fatal: empty if not migrated yet.
export async function getMachines(supabase: SupabaseClient): Promise<Machine[]> {
  const { data } = await supabase.from("machines").select(COLS).order("name");
  return (data ?? []).map(toMachine);
}

// A single machine for the scanned state page. Null if missing or not permitted.
export async function getMachine(supabase: SupabaseClient, id: string): Promise<Machine | null> {
  const { data } = await supabase.from("machines").select(COLS).eq("id", id).maybeSingle();
  return data ? toMachine(data) : null;
}

function toReport(row: Record<string, unknown>): MaintenanceReport {
  return {
    id: row.id as string,
    machineId: row.machine_id as string,
    model: row.model as MachineModel,
    reportDate: row.report_date as string,
    maintenanceType: (row.maintenance_type as MaintenanceType | null) ?? null,
    operatingHours: (row.operating_hours as string | null) ?? null,
    siteLocation: (row.site_location as string | null) ?? null,
    machineStatus: (row.machine_status as ReportStatus | null) ?? null,
    problemFound: (row.problem_found as string | null) ?? null,
    workPerformed: (row.work_performed as string | null) ?? null,
    partsReplaced: (row.parts_replaced as string | null) ?? null,
    partsRequired: (row.parts_required as string | null) ?? null,
    nextMaintenance: (row.next_maintenance as string | null) ?? null,
    technicianName: (row.technician_name as string | null) ?? null,
    checklist: (row.checklist as Record<string, ChecklistEntry> | null) ?? {},
    functionTest: (row.function_test as Record<string, boolean> | null) ?? {},
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string | null) ?? null,
  };
}

// The single living report for one machine, or null if none exists yet.
// Non-fatal: null if the maintenance migration has not been applied yet.
export async function getMachineReport(supabase: SupabaseClient, machineId: string): Promise<MaintenanceReport | null> {
  const { data } = await supabase.from("maintenance_reports").select("*").eq("machine_id", machineId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data ? toReport(data) : null;
}

// All reports, one per machine, for the portal Reports section. Non-fatal: empty
// if the maintenance migration has not been applied yet.
export async function getReports(supabase: SupabaseClient): Promise<MaintenanceReport[]> {
  const { data } = await supabase.from("maintenance_reports").select("*").order("updated_at", { ascending: false });
  return (data ?? []).map(toReport);
}

function toSnapshot(row: Record<string, unknown>): ReportSnapshot {
  return {
    id: row.id as string,
    machineId: row.machine_id as string,
    model: row.model as MachineModel,
    reportDate: (row.report_date as string | null) ?? null,
    maintenanceType: (row.maintenance_type as MaintenanceType | null) ?? null,
    operatingHours: (row.operating_hours as string | null) ?? null,
    siteLocation: (row.site_location as string | null) ?? null,
    machineStatus: (row.machine_status as ReportStatus | null) ?? null,
    problemFound: (row.problem_found as string | null) ?? null,
    workPerformed: (row.work_performed as string | null) ?? null,
    partsReplaced: (row.parts_replaced as string | null) ?? null,
    partsRequired: (row.parts_required as string | null) ?? null,
    nextMaintenance: (row.next_maintenance as string | null) ?? null,
    technicianName: (row.technician_name as string | null) ?? null,
    checklist: (row.checklist as Record<string, ChecklistEntry> | null) ?? {},
    functionTest: (row.function_test as Record<string, boolean> | null) ?? {},
    savedAt: row.saved_at as string,
  };
}

// Saved versions of a machine's report, newest first. Non-fatal: empty if the
// snapshots migration has not been applied yet.
export async function getMachineSnapshots(supabase: SupabaseClient, machineId: string): Promise<ReportSnapshot[]> {
  const { data } = await supabase.from("maintenance_report_snapshots").select("*").eq("machine_id", machineId).order("saved_at", { ascending: false }).limit(200);
  return (data ?? []).map(toSnapshot);
}

// A single saved version by id (for the printable PDF view).
export async function getSnapshot(supabase: SupabaseClient, id: string): Promise<ReportSnapshot | null> {
  const { data } = await supabase.from("maintenance_report_snapshots").select("*").eq("id", id).maybeSingle();
  return data ? toSnapshot(data) : null;
}

// All saved versions across machines, newest first, for the portal Reports
// section. Non-fatal: empty if the snapshots migration has not been applied yet.
export async function getSnapshots(supabase: SupabaseClient): Promise<ReportSnapshot[]> {
  const { data } = await supabase.from("maintenance_report_snapshots").select("*").order("saved_at", { ascending: false }).limit(1000);
  return (data ?? []).map(toSnapshot);
}
