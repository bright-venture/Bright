import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Inventory, Movement, MovementKind } from "./inventory-types";

// Loads inventory for the portal, scoped by the caller's RLS. Non-fatal: if the
// inventory migration is not applied yet, everything comes back empty.
export async function getInventory(supabase: SupabaseClient): Promise<Inventory> {
  const [productsResult, locationsResult, movementsResult, onHandResult] = await Promise.all([
    supabase.from("products").select("id, brand_id, name, unit, brands(name)").order("name"),
    supabase.from("stock_locations").select("id, name, brand_id, brands(name)").order("name"),
    supabase.from("stock_movements").select("id, product_id, location_id, kind, quantity, note, occurred_at, products(name), stock_locations(name)").order("occurred_at", { ascending: false }).order("created_at", { ascending: false }).limit(200),
    supabase.from("product_on_hand").select("product_id, on_hand"),
  ]);

  const products = (productsResult.data ?? []).map(row => ({
    id: row.id as string,
    brandId: row.brand_id as string,
    brandName: (row.brands as unknown as { name: string } | null)?.name ?? "",
    name: row.name as string,
    unit: row.unit as string,
  }));

  const locations = (locationsResult.data ?? []).map(row => ({
    id: row.id as string,
    name: row.name as string,
    brandId: (row.brand_id as string | null) ?? null,
    brandName: (row.brands as unknown as { name: string } | null)?.name ?? "",
  }));

  const movements: Movement[] = (movementsResult.data ?? []).map(row => ({
    id: row.id as string,
    productId: row.product_id as string,
    productName: (row.products as unknown as { name: string } | null)?.name ?? "(deleted product)",
    locationId: row.location_id as string,
    locationName: (row.stock_locations as unknown as { name: string } | null)?.name ?? "(deleted location)",
    kind: row.kind as MovementKind,
    quantity: Number(row.quantity),
    note: (row.note as string | null) ?? null,
    occurredAt: row.occurred_at as string,
  }));

  const onHand: Record<string, number> = {};
  for (const row of onHandResult.data ?? []) onHand[row.product_id as string] = Number(row.on_hand);

  return { products, locations, movements, onHand };
}
