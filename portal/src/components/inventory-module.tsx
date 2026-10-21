"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, Boxes, Check, Cpu, MapPin, Package, Pencil, Plus, Trash2, X } from "lucide-react";
import { createLocation, createProduct, deleteLocation, deleteMovement, deleteProduct, recordMovement, renameLocation, updateProduct } from "@/lib/portal/inventory";
import type { Inventory, InventoryResult, MovementKind } from "@/lib/portal/inventory-types";
import { MachinesConsole } from "./machines-console";
import { Select } from "./select";
import { DateInput } from "./date-input";
import type { Machine } from "@/lib/portal/machine-types";

type Brand = { id: string; name: string };
type Tab = "products" | "locations" | "movements" | "machines";

function formatQty(n: number): string {
  return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(3)));
}

export function InventoryModule({ inventory, brands, brandId, machines, isAdmin }: { inventory: Inventory; brands: Brand[]; brandId: string; machines: Machine[]; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("products");
  const [error, setError] = useState("");

  // Add-product form
  const [pName, setPName] = useState("");
  const [pUnit, setPUnit] = useState("kg");
  const [pBrand, setPBrand] = useState(brandId || brands[0]?.id || "");
  const [editingProduct, setEditingProduct] = useState<{ id: string; name: string; unit: string } | null>(null);

  // Locations
  const [locName, setLocName] = useState("");
  const [editingLoc, setEditingLoc] = useState<{ id: string; name: string } | null>(null);

  // Movement form
  const [mProduct, setMProduct] = useState("");
  const [mLocation, setMLocation] = useState("");
  const [mKind, setMKind] = useState<MovementKind>("receipt");
  const [mQty, setMQty] = useState("");
  const [mDate, setMDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mNote, setMNote] = useState("");

  const visibleProducts = useMemo(() => inventory.products.filter(p => !brandId || p.brandId === brandId), [inventory.products, brandId]);
  const visibleLocations = useMemo(() => inventory.locations.filter(l => !brandId || l.brandId === brandId), [inventory.locations, brandId]);
  // Movements are scoped through their product's brand.
  const productBrand = useMemo(() => new Map(inventory.products.map(p => [p.id, p.brandId])), [inventory.products]);
  const visibleMovements = useMemo(() => inventory.movements.filter(m => !brandId || productBrand.get(m.productId) === brandId), [inventory.movements, productBrand, brandId]);
  const [locBrand, setLocBrand] = useState(brandId || brands[0]?.id || "");

  function run(action: () => Promise<InventoryResult>, onDone?: () => void) {
    setError("");
    startTransition(async () => {
      const result = await action();
      if (!result.ok) { setError(result.error ?? "Something went wrong. Please try again."); return; }
      onDone?.();
      router.refresh();
    });
  }

  function startMovement(productId: string) {
    setMProduct(productId); setMKind("receipt"); setMQty(""); setMNote("");
    setTab("movements"); setError("");
  }

  const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
    { id: "products", label: "Products", icon: Package },
    { id: "locations", label: "Locations", icon: MapPin },
    { id: "movements", label: "Movements", icon: Boxes },
    { id: "machines", label: "Machines", icon: Cpu },
  ];

  return <div className="inventory">
    <div className="inv-tabs">
      {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={tab === id ? "active" : ""} onClick={() => { setTab(id); setError(""); }}><Icon size={16} /> {label}</button>)}
    </div>
    {error && <p className="folder-error" role="alert">{error}</p>}

    {tab === "products" && <>
      <section className="portal-panel">
        <div className="panel-heading"><div><h2>Add a product</h2><p>Products belong to a brand and are counted in a unit (kg, box, crate…).</p></div></div>
        <form className="inv-form" onSubmit={e => { e.preventDefault(); if (!pName.trim() || !pBrand) return; run(() => createProduct({ brandId: pBrand, name: pName, unit: pUnit }), () => { setPName(""); setPUnit("kg"); }); }}>
          <div className="admin-field"><label htmlFor="p-name">Name</label><input id="p-name" value={pName} onChange={e => setPName(e.target.value)} maxLength={160} placeholder="Floor cleaner" disabled={pending} required /></div>
          <div className="admin-field"><label htmlFor="p-unit">Unit</label><input id="p-unit" value={pUnit} onChange={e => setPUnit(e.target.value)} maxLength={20} placeholder="kg" disabled={pending} required /></div>
          <div className="admin-field"><label htmlFor="p-brand">Brand</label><Select id="p-brand" ariaLabel="Brand" value={pBrand} onChange={setPBrand} disabled={pending} options={brands.map(b => ({ value: b.id, label: b.name }))} /></div>
          <button className="folder-add" disabled={pending || !pName.trim() || !pBrand}><Plus size={16} /> Add product</button>
        </form>
      </section>
      <section className="portal-panel">
        <div className="panel-heading"><div><h2>Products</h2><p>{visibleProducts.length} {visibleProducts.length === 1 ? "product" : "products"}{brandId ? " in this brand" : ""}</p></div></div>
        <ul className="inv-list">
          {visibleProducts.length === 0 && <li className="inv-empty">No products yet. Add one above.</li>}
          {visibleProducts.map(product => {
            const onHand = inventory.onHand[product.id] ?? 0;
            if (editingProduct?.id === product.id) return <li key={product.id} className="inv-row">
              <span className="inv-icon"><Package size={19} /></span>
              <div className="inv-edit">
                <input value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} maxLength={160} placeholder="Name" disabled={pending} aria-label="Product name" />
                <input value={editingProduct.unit} onChange={e => setEditingProduct({ ...editingProduct, unit: e.target.value })} maxLength={20} placeholder="Unit" disabled={pending} aria-label="Unit" />
                <button className="icon-btn" disabled={pending || !editingProduct.name.trim()} onClick={() => run(() => updateProduct({ id: product.id, name: editingProduct.name, unit: editingProduct.unit }), () => setEditingProduct(null))} aria-label="Save"><Check size={16} /></button>
                <button type="button" className="icon-btn" onClick={() => setEditingProduct(null)} disabled={pending} aria-label="Cancel"><X size={16} /></button>
              </div>
            </li>;
            return <li key={product.id} className="inv-row">
              <span className="inv-icon"><Package size={19} /></span>
              <div className="inv-identity">
                <strong>{product.name}</strong>
                <span>{product.brandName}</span>
              </div>
              <div className="inv-onhand"><strong>{formatQty(onHand)}</strong><span>{product.unit} on hand</span></div>
              <div className="inv-actions">
                <button type="button" className="inv-move-btn" onClick={() => startMovement(product.id)} disabled={pending}><ArrowDownToLine size={15} /> Move</button>
                <button type="button" className="icon-btn" onClick={() => { setError(""); setEditingProduct({ id: product.id, name: product.name, unit: product.unit }); }} disabled={pending} aria-label={`Edit ${product.name}`}><Pencil size={15} /></button>
                {isAdmin && <button type="button" className="icon-btn danger" onClick={() => { if (window.confirm(`Are you sure you want to delete "${product.name}" and all its stock movements? This cannot be undone.`)) run(() => deleteProduct({ id: product.id })); }} disabled={pending} aria-label={`Delete ${product.name}`}><Trash2 size={15} /></button>}
              </div>
            </li>;
          })}
        </ul>
      </section>
    </>}

    {tab === "locations" && <section className="portal-panel">
      <div className="panel-heading"><div><h2>Stock locations</h2><p>Warehouses, cold rooms, or any place stock is held. Each belongs to a brand.</p></div></div>
      <form className="inv-form" onSubmit={e => { e.preventDefault(); if (!locName.trim() || !locBrand) return; run(() => createLocation({ name: locName, brandId: locBrand }), () => setLocName("")); }}>
        <div className="admin-field"><label htmlFor="loc-name">New location</label><input id="loc-name" value={locName} onChange={e => setLocName(e.target.value)} maxLength={120} placeholder="Main cold room" disabled={pending} required /></div>
        <div className="admin-field"><label htmlFor="loc-brand">Brand</label><Select id="loc-brand" ariaLabel="Brand" value={locBrand} onChange={setLocBrand} disabled={pending} options={brands.map(b => ({ value: b.id, label: b.name }))} /></div>
        <button className="folder-add" disabled={pending || !locName.trim() || !locBrand}><Plus size={16} /> Add location</button>
      </form>
      <ul className="inv-list">
        {visibleLocations.length === 0 && <li className="inv-empty">No locations yet. Add one above.</li>}
        {visibleLocations.map(loc => editingLoc?.id === loc.id ? <li key={loc.id} className="inv-row">
          <span className="inv-icon"><MapPin size={19} /></span>
          <div className="inv-edit">
            <input value={editingLoc.name} onChange={e => setEditingLoc({ id: loc.id, name: e.target.value })} maxLength={120} disabled={pending} aria-label="Location name" />
            <button className="icon-btn" disabled={pending || !editingLoc.name.trim()} onClick={() => run(() => renameLocation({ id: loc.id, name: editingLoc.name }), () => setEditingLoc(null))} aria-label="Save"><Check size={16} /></button>
            <button type="button" className="icon-btn" onClick={() => setEditingLoc(null)} disabled={pending} aria-label="Cancel"><X size={16} /></button>
          </div>
        </li> : <li key={loc.id} className="inv-row">
          <span className="inv-icon"><MapPin size={19} /></span>
          <div className="inv-identity"><strong>{loc.name}</strong><span>{loc.brandName || "Unassigned"}</span></div>
          <div className="inv-actions">
            <button type="button" className="icon-btn" onClick={() => { setError(""); setEditingLoc({ id: loc.id, name: loc.name }); }} disabled={pending} aria-label={`Rename ${loc.name}`}><Pencil size={15} /></button>
            {isAdmin && <button type="button" className="icon-btn danger" onClick={() => { if (window.confirm(`Are you sure you want to delete "${loc.name}"?`)) run(() => deleteLocation({ id: loc.id })); }} disabled={pending} aria-label={`Delete ${loc.name}`}><Trash2 size={15} /></button>}
          </div>
        </li>)}
      </ul>
    </section>}

    {tab === "movements" && <>
      <section className="portal-panel">
        <div className="panel-heading"><div><h2>Record a movement</h2><p>Receipts add stock; dispatches remove it.</p></div></div>
        <form className="inv-form movement" onSubmit={e => { e.preventDefault(); run(() => recordMovement({ productId: mProduct, locationId: mLocation, kind: mKind, quantity: mQty, note: mNote || null, occurredAt: mDate }), () => { setMQty(""); setMNote(""); }); }}>
          <div className="admin-field"><label htmlFor="m-kind">Type</label><Select id="m-kind" ariaLabel="Movement type" value={mKind} onChange={v => setMKind(v as MovementKind)} disabled={pending} options={[{ value: "receipt", label: "Receipt (in)" }, { value: "dispatch", label: "Dispatch (out)" }]} /></div>
          <div className="admin-field"><label htmlFor="m-product">Product</label><Select id="m-product" ariaLabel="Product" value={mProduct} onChange={setMProduct} disabled={pending} placeholder="Choose…" options={visibleProducts.map(p => ({ value: p.id, label: p.name }))} /></div>
          <div className="admin-field"><label htmlFor="m-location">Location</label><Select id="m-location" ariaLabel="Location" value={mLocation} onChange={setMLocation} disabled={pending} placeholder="Choose…" options={visibleLocations.map(l => ({ value: l.id, label: l.name }))} /></div>
          <div className="admin-field"><label htmlFor="m-qty">Quantity</label><input id="m-qty" type="number" min="0" step="any" value={mQty} onChange={e => setMQty(e.target.value)} placeholder="0" disabled={pending} required /></div>
          <div className="admin-field"><label htmlFor="m-date">Date</label><DateInput id="m-date" value={mDate} onChange={setMDate} disabled={pending} required /></div>
          <div className="admin-field wide"><label htmlFor="m-note">Note <span className="opt">(optional)</span></label><input id="m-note" value={mNote} onChange={e => setMNote(e.target.value)} maxLength={400} placeholder="Supplier, PO number…" disabled={pending} /></div>
          <button className="folder-add" disabled={pending || !mProduct || !mLocation || !mQty}>{mKind === "receipt" ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />} Record</button>
        </form>
      </section>
      <section className="portal-panel">
        <div className="panel-heading"><div><h2>Recent movements</h2><p>Most recent first (up to 200).</p></div></div>
        <ul className="inv-list">
          {visibleMovements.length === 0 && <li className="inv-empty">No movements recorded yet.</li>}
          {visibleMovements.map(m => <li key={m.id} className="inv-row movement-row">
            <span className={`move-badge ${m.kind}`}>{m.kind === "receipt" ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}</span>
            <div className="inv-identity"><strong>{m.productName}</strong><span>{m.locationName} · {m.occurredAt}{m.note ? ` · ${m.note}` : ""}</span></div>
            <div className="move-qty"><strong>{m.kind === "receipt" ? "+" : "−"}{formatQty(m.quantity)}</strong></div>
            <div className="inv-actions">{isAdmin && <button type="button" className="icon-btn danger" onClick={() => { if (window.confirm("Are you sure you want to delete this movement? Stock totals will adjust.")) run(() => deleteMovement({ id: m.id })); }} disabled={pending} aria-label="Delete movement"><Trash2 size={15} /></button>}</div>
          </li>)}
        </ul>
      </section>
    </>}

    {tab === "machines" && <MachinesConsole machines={machines} isAdmin={isAdmin} brands={brands} brandId={brandId} />}
  </div>;
}
