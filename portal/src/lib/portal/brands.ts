"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/employee";
import type { BrandResult } from "./brand-types";

function cleanName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  return text.length >= 1 && text.length <= 120 ? text : null;
}

function cleanId(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

// A URL-safe slug for the brand. Referenced only for display accents, so a stable
// value derived from the name is enough; uniqueness is enforced by the database.
function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "brand";
}

// Create/rename/delete are admin-only (RLS also enforces has_admin_access()).
export async function createBrand(input: { name: string }): Promise<BrandResult> {
  const { supabase } = await requireAdmin();
  const name = cleanName(input.name);
  if (!name) return { ok: false, error: "Enter a brand name (1-120 characters)." };
  // The slug is unique; on collision, retry with a short random suffix.
  const slug = slugify(name);
  for (let attempt = 0; attempt < 4; attempt++) {
    const candidate = attempt === 0 ? slug : `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await supabase.from("brands").insert({ name, slug: candidate });
    if (!error) { revalidatePath("/portal"); return { ok: true }; }
    if (error.code !== "23505") return { ok: false, error: "Could not add the brand. Please try again." };
  }
  return { ok: false, error: "A brand with a similar name already exists. Try a different name." };
}

export async function updateBrand(input: { id: string; name: string }): Promise<BrandResult> {
  const { supabase } = await requireAdmin();
  const id = cleanId(input.id);
  const name = cleanName(input.name);
  if (!id) return { ok: false, error: "Invalid brand." };
  if (!name) return { ok: false, error: "Enter a brand name (1-120 characters)." };
  const { error } = await supabase.from("brands").update({ name }).eq("id", id);
  if (error) return { ok: false, error: "Could not update the brand. Please try again." };
  revalidatePath("/portal");
  return { ok: true };
}

export async function deleteBrand(input: { id: string }): Promise<BrandResult> {
  const { supabase } = await requireAdmin();
  const id = cleanId(input.id);
  if (!id) return { ok: false, error: "Invalid brand." };
  // Deleting a brand cascades to its products and their stock movements (see the
  // inventory migration). The console warns before calling this.
  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete the brand. Please try again." };
  revalidatePath("/portal");
  return { ok: true };
}
