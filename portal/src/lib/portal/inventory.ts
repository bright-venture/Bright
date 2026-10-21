"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireEmployee } from "@/lib/auth/employee";
import type { InventoryResult, MovementKind } from "./inventory-types";

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

function cleanQuantity(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n) || n <= 0 || n > 1e11) return null;
  return Math.round(n * 1000) / 1000;
}

function cleanDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : value;
}

// Products ------------------------------------------------------------------
export async function createProduct(input: { brandId: string; name: string; unit: string }): Promise<InventoryResult> {
  const { supabase } = await requireEmployee();
  const brandId = cleanId(input.brandId);
  const name = cleanText(input.name, 1, 160);
  const unit = cleanText(input.unit, 1, 20);
  if (!brandId) return { ok: false, error: "Choose a brand." };
  if (!name) return { ok: false, error: "Enter a product name (1-160 characters)." };
  if (!unit) return { ok: false, error: "Enter a unit (e.g. kg, box)." };
  const { error } = await supabase.from("products").insert({ brand_id: brandId, name, unit });
  if (error) return { ok: false, error: "Could not add the product. Please try again." };
  revalidatePath("/portal");
  return { ok: true };
}

export async function updateProduct(input: { id: string; name: string; unit: string }): Promise<InventoryResult> {
  const { supabase } = await requireEmployee();
  const id = cleanId(input.id);
  const name = cleanText(input.name, 1, 160);
  const unit = cleanText(input.unit, 1, 20);
  if (!id) return { ok: false, error: "Invalid product." };
  if (!name) return { ok: false, error: "Enter a product name (1-160 characters)." };
  if (!unit) return { ok: false, error: "Enter a unit (e.g. kg, box)." };
  const { error } = await supabase.from("products").update({ name, unit }).eq("id", id);
  if (error) return { ok: false, error: "Could not update the product. Please try again." };
  revalidatePath("/portal");
  return { ok: true };
}

export async function deleteProduct(input: { id: string }): Promise<InventoryResult> {
  const { supabase } = await requireAdmin();
  const id = cleanId(input.id);
  if (!id) return { ok: false, error: "Invalid product." };
  // Movements for this product are removed by the on delete cascade.
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete the product. Please try again." };
  revalidatePath("/portal");
  return { ok: true };
}

// Locations -----------------------------------------------------------------
export async function createLocation(input: { name: string; brandId: string | null }): Promise<InventoryResult> {
  const { supabase } = await requireEmployee();
  const name = cleanText(input.name, 1, 120);
  const brandId = cleanId(input.brandId);
  if (!name) return { ok: false, error: "Enter a location name (1-120 characters)." };
  if (!brandId) return { ok: false, error: "Choose a brand for this location." };
  const { error } = await supabase.from("stock_locations").insert({ name, brand_id: brandId });
  if (error) return { ok: false, error: "Could not add the location. Please try again." };
  revalidatePath("/portal");
  return { ok: true };
}

export async function renameLocation(input: { id: string; name: string }): Promise<InventoryResult> {
  const { supabase } = await requireEmployee();
  const id = cleanId(input.id);
  const name = cleanText(input.name, 1, 120);
  if (!id) return { ok: false, error: "Invalid location." };
  if (!name) return { ok: false, error: "Enter a location name (1-120 characters)." };
  const { error } = await supabase.from("stock_locations").update({ name }).eq("id", id);
  if (error) return { ok: false, error: "Could not rename the location. Please try again." };
  revalidatePath("/portal");
  return { ok: true };
}

export async function deleteLocation(input: { id: string }): Promise<InventoryResult> {
  const { supabase } = await requireAdmin();
  const id = cleanId(input.id);
  if (!id) return { ok: false, error: "Invalid location." };
  const { error } = await supabase.from("stock_locations").delete().eq("id", id);
  // A location referenced by movements is protected by on delete restrict.
  if (error) return { ok: false, error: "This location has stock movements and cannot be deleted." };
  revalidatePath("/portal");
  return { ok: true };
}

// Movements -----------------------------------------------------------------
export async function recordMovement(input: { productId: string; locationId: string; kind: string; quantity: number | string; note: string | null; occurredAt: string }): Promise<InventoryResult> {
  const { supabase } = await requireEmployee();
  const productId = cleanId(input.productId);
  const locationId = cleanId(input.locationId);
  const kind: MovementKind | null = input.kind === "receipt" || input.kind === "dispatch" ? input.kind : null;
  const quantity = cleanQuantity(input.quantity);
  const note = cleanOptional(input.note, 400);
  const occurredAt = cleanDate(input.occurredAt);
  if (!productId) return { ok: false, error: "Choose a product." };
  if (!locationId) return { ok: false, error: "Choose a location." };
  if (!kind) return { ok: false, error: "Choose receipt or dispatch." };
  if (!quantity) return { ok: false, error: "Enter a quantity greater than zero." };
  if (!occurredAt) return { ok: false, error: "Enter a valid date." };

  if (kind === "dispatch") {
    const { data: stock, error } = await supabase.from("product_on_hand").select("on_hand").eq("product_id", productId).maybeSingle();
    if (error) return { ok: false, error: "Could not check current stock." };
    const onHand = Number(stock?.on_hand ?? 0);
    if (quantity > onHand) return { ok: false, error: `Not enough stock. On hand: ${onHand}.` };
  }

  const { error } = await supabase.from("stock_movements").insert({ product_id: productId, location_id: locationId, kind, quantity, note, occurred_at: occurredAt });
  if (error) return { ok: false, error: "Could not record the movement. Please try again." };
  revalidatePath("/portal");
  return { ok: true };
}

export async function deleteMovement(input: { id: string }): Promise<InventoryResult> {
  const { supabase } = await requireAdmin();
  const id = cleanId(input.id);
  if (!id) return { ok: false, error: "Invalid movement." };
  const { error } = await supabase.from("stock_movements").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete the movement. Please try again." };
  revalidatePath("/portal");
  return { ok: true };
}
