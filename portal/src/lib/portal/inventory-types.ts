// Shared types for the Inventory module. Kept out of the "use server" actions file.
export type MovementKind = "receipt" | "dispatch";
export type Product = { id: string; brandId: string; brandName: string; name: string; unit: string };
export type StockLocation = { id: string; name: string; brandId: string | null; brandName: string };
export type Movement = {
  id: string;
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  kind: MovementKind;
  quantity: number;
  note: string | null;
  occurredAt: string;
};
export type Inventory = {
  products: Product[];
  locations: StockLocation[];
  movements: Movement[];
  onHand: Record<string, number>;
};
export type InventoryResult = { ok: boolean; error?: string };
