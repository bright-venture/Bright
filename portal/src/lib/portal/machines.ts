"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin, requireEmployee } from "@/lib/auth/employee";
import { MACHINE_STATUSES, type MachineResult, type MachineStatus } from "./machine-types";
import { MACHINE_MODELS, type MachineModel } from "./maintenance-templates";

const REPORTS_ROOT = "Machine Reports";

// Ensures a machine has its Documents folder: a per-brand "Machine Reports" folder,
// with a subfolder named after the machine inside it, linked via documents_folder_id.
// Best-effort: any failure (e.g. a not-yet-applied migration) leaves the machine
// usable, just without an auto folder. Also keeps the folder name in sync on rename.
async function ensureReportFolder(supabase: SupabaseClient, machineId: string, name: string, brandId: string | null) {
  if (!brandId) return;
  try {
    // The per-brand "Machine Reports" root folder.
    const { data: root } = await supabase.from("portal_folders").select("id")
      .eq("module", "documents").eq("brand_id", brandId).is("parent_id", null).eq("name", REPORTS_ROOT).limit(1).maybeSingle();
    let rootId = root?.id as string | undefined;
    if (!rootId) {
      const { data, error } = await supabase.from("portal_folders").insert({ module: "documents", name: REPORTS_ROOT, parent_id: null, brand_id: brandId }).select("id").single();
      if (error || !data) return;
      rootId = data.id as string;
    }
    // The machine's own subfolder: reuse if linked, else create; keep its name current.
    const { data: machine } = await supabase.from("machines").select("documents_folder_id").eq("id", machineId).maybeSingle();
    const folderId = machine?.documents_folder_id as string | null | undefined;
    if (folderId) {
      await supabase.from("portal_folders").update({ name }).eq("id", folderId);
      return;
    }
    const { data: sub, error: subErr } = await supabase.from("portal_folders").insert({ module: "documents", name, parent_id: rootId, brand_id: brandId }).select("id").single();
    if (subErr || !sub) return;
    await supabase.from("machines").update({ documents_folder_id: sub.id }).eq("id", machineId);
  } catch { /* best-effort */ }
}

function cleanText(value: unknown, min: number, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  return text.length >= min && text.length <= max ? text : null;
}

function cleanOptional(value: unknown, max: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length >= 1 && text.length <= max ? text : null;
}

function cleanId(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

function asStatus(value: unknown): MachineStatus | null {
  return typeof value === "string" && (MACHINE_STATUSES as readonly string[]).includes(value) ? value as MachineStatus : null;
}

function asModel(value: unknown): MachineModel | null {
  return typeof value === "string" && (MACHINE_MODELS as readonly string[]).includes(value) ? value as MachineModel : null;
}

// Create/edit/delete are admin-only (RLS also enforces has_admin_access()).
export async function createMachine(input: { name: string; location: string | null; status: string; brandId: string | null; model: string | null; assetTag: string | null }): Promise<MachineResult> {
  const { supabase } = await requireAdmin();
  const name = cleanText(input.name, 1, 160);
  const location = cleanOptional(input.location, 160);
  const status = asStatus(input.status) ?? "running";
  const brandId = cleanId(input.brandId);
  const model = asModel(input.model);
  const assetTag = cleanOptional(input.assetTag, 80);
  if (!name) return { ok: false, error: "Enter a machine name (1-160 characters)." };
  if (!brandId) return { ok: false, error: "Choose a brand for this machine." };
  if (!model) return { ok: false, error: "Choose the machine model (report template)." };
  const { data: created, error } = await supabase.from("machines").insert({ name, location, status, brand_id: brandId, model, asset_tag: assetTag }).select("id").single();
  if (error || !created) return { ok: false, error: "Could not add the machine. Please try again." };
  // Auto-create the blank report and the machine's Documents folder structure.
  await supabase.from("maintenance_reports").insert({ machine_id: created.id, model }).select("id").maybeSingle();
  await ensureReportFolder(supabase, created.id, name, brandId);
  revalidatePath("/portal");
  return { ok: true };
}

export async function updateMachine(input: { id: string; name: string; location: string | null; model: string | null; assetTag: string | null }): Promise<MachineResult> {
  const { supabase } = await requireAdmin();
  const id = cleanId(input.id);
  const name = cleanText(input.name, 1, 160);
  const location = cleanOptional(input.location, 160);
  const model = asModel(input.model);
  const assetTag = cleanOptional(input.assetTag, 80);
  if (!id) return { ok: false, error: "Invalid machine." };
  if (!name) return { ok: false, error: "Enter a machine name (1-160 characters)." };
  if (!model) return { ok: false, error: "Choose the machine model (report template)." };
  const { error } = await supabase.from("machines").update({ name, location, model, asset_tag: assetTag }).eq("id", id);
  if (error) return { ok: false, error: "Could not update the machine. Please try again." };
  // Keep the machine's Documents folder present and its name in sync.
  const { data: m } = await supabase.from("machines").select("brand_id").eq("id", id).maybeSingle();
  await ensureReportFolder(supabase, id, name, (m?.brand_id as string | null) ?? null);
  revalidatePath("/portal");
  return { ok: true };
}

// Backfill: create the Documents folder structure for existing machines that lack it.
export async function ensureAllReportFolders(): Promise<MachineResult> {
  const { supabase } = await requireAdmin();
  const { data: machines, error } = await supabase.from("machines").select("id, name, brand_id");
  if (error) return { ok: false, error: "Could not load machines. Please try again." };
  for (const m of machines ?? []) await ensureReportFolder(supabase, m.id as string, m.name as string, (m.brand_id as string | null) ?? null);
  revalidatePath("/portal");
  return { ok: true };
}

export async function deleteMachine(input: { id: string }): Promise<MachineResult> {
  const { supabase } = await requireAdmin();
  const id = cleanId(input.id);
  if (!id) return { ok: false, error: "Invalid machine." };
  const { error } = await supabase.from("machines").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete the machine. Please try again." };
  revalidatePath("/portal");
  return { ok: true };
}

// Any approved MFA employee can update a machine's live state (from the scan page).
export async function updateMachineState(input: { id: string; status: string; notes: string | null }): Promise<MachineResult> {
  const { supabase, claims } = await requireEmployee();
  const id = cleanId(input.id);
  const status = asStatus(input.status);
  const notes = cleanOptional(input.notes, 1000);
  if (!id) return { ok: false, error: "Invalid machine." };
  if (!status) return { ok: false, error: "Choose a status." };
  const { error } = await supabase.from("machines").update({ status, notes, updated_at: new Date().toISOString(), updated_by: claims.sub }).eq("id", id);
  if (error) return { ok: false, error: "Could not update the machine state. Please try again." };
  revalidatePath(`/m/${id}`);
  revalidatePath("/portal");
  return { ok: true };
}
