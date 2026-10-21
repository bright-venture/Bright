"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { requireEmployee } from "@/lib/auth/employee";
import { FOLDER_MODULES, type FolderModule, type FolderResult } from "./folder-types";

function isModule(value: unknown): value is FolderModule {
  return typeof value === "string" && (FOLDER_MODULES as readonly string[]).includes(value);
}

function cleanName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  return name.length >= 1 && name.length <= 120 ? name : null;
}

function cleanId(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

// Every action re-checks identity, active membership, and MFA on the server.
// The client only ever sends ids and the requested change; RLS is the boundary.
export async function createFolder(input: { module: string; name: string; parentId: string | null; brandId?: string | null }): Promise<FolderResult> {
  const { supabase } = await requireEmployee();
  if (!isModule(input.module)) return { ok: false, error: "Unknown section." };
  const name = cleanName(input.name);
  if (!name) return { ok: false, error: "Enter a name between 1 and 120 characters." };
  const parentId = input.parentId ? cleanId(input.parentId) : null;
  if (input.parentId && !parentId) return { ok: false, error: "Invalid destination folder." };

  // A subfolder inherits its parent's brand; a top-level folder needs one chosen.
  let brandId: string | null = null;
  if (parentId) {
    const { data: parent, error } = await supabase.from("portal_folders").select("id, module, brand_id").eq("id", parentId).maybeSingle();
    if (error) return { ok: false, error: "Could not verify the destination folder." };
    if (!parent || parent.module !== input.module) return { ok: false, error: "The destination folder is invalid." };
    brandId = (parent.brand_id as string | null) ?? null;
  } else {
    brandId = cleanId(input.brandId);
    if (!brandId) return { ok: false, error: "Choose a brand for this folder." };
  }

  const { error } = await supabase.from("portal_folders").insert({ module: input.module, name, parent_id: parentId, brand_id: brandId });
  if (error) return { ok: false, error: `Could not create the folder: ${error.message}` };
  revalidatePath("/portal");
  return { ok: true };
}

export async function renameFolder(input: { id: string; name: string }): Promise<FolderResult> {
  const { supabase } = await requireEmployee();
  const id = cleanId(input.id);
  if (!id) return { ok: false, error: "Invalid folder." };
  const name = cleanName(input.name);
  if (!name) return { ok: false, error: "Enter a name between 1 and 120 characters." };

  const { error } = await supabase.from("portal_folders").update({ name }).eq("id", id);
  if (error) return { ok: false, error: "Could not rename the folder. Please try again." };
  revalidatePath("/portal");
  return { ok: true };
}

export async function deleteFolder(input: { id: string }): Promise<FolderResult> {
  const { supabase } = await requireEmployee();
  const id = cleanId(input.id);
  if (!id) return { ok: false, error: "Invalid folder." };

  // Child folders are removed by the on delete cascade in the migration.
  const { error } = await supabase.from("portal_folders").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete the folder. Please try again." };
  revalidatePath("/portal");
  return { ok: true };
}

export async function moveFolder(input: { id: string; parentId: string | null }): Promise<FolderResult> {
  const { supabase } = await requireEmployee();
  const id = cleanId(input.id);
  if (!id) return { ok: false, error: "Invalid folder." };
  const parentId = input.parentId ? cleanId(input.parentId) : null;
  if (input.parentId && !parentId) return { ok: false, error: "Invalid destination folder." };
  if (parentId === id) return { ok: false, error: "A folder cannot be moved into itself." };

  const { data: folder, error: folderError } = await supabase.from("portal_folders").select("id, module").eq("id", id).maybeSingle();
  if (folderError) return { ok: false, error: "Could not load the folder." };
  if (!folder) return { ok: false, error: "That folder no longer exists." };

  if (parentId) {
    const { data: rows, error } = await supabase.from("portal_folders").select("id, parent_id, module").eq("module", folder.module);
    if (error) return { ok: false, error: "Could not verify the destination folder." };
    const byId = new Map(rows?.map(row => [row.id, row]) ?? []);
    const dest = byId.get(parentId);
    if (!dest) return { ok: false, error: "The destination folder is invalid." };
    // Walk up from the destination: if we reach the folder itself, this is a cycle.
    for (let cursor: string | null = parentId; cursor; cursor = byId.get(cursor)?.parent_id ?? null) {
      if (cursor === id) return { ok: false, error: "A folder cannot be moved inside one of its own subfolders." };
    }
  }

  const { error } = await supabase.from("portal_folders").update({ parent_id: parentId }).eq("id", id);
  if (error) return { ok: false, error: "Could not move the folder. Please try again." };
  revalidatePath("/portal");
  return { ok: true };
}
