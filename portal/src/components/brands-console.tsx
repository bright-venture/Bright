"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, Sprout, Trash2, X } from "lucide-react";
import { createBrand, deleteBrand, updateBrand } from "@/lib/portal/brands";
import type { Brand, BrandResult } from "@/lib/portal/brand-types";
import { ConfirmDelete } from "./confirm-delete";

// Admin-only management of the company's brands. Brands feed the portal brand
// filter, the Overview list, and every product in Inventory.
export function BrandsConsole({ brands, productCounts }: { brands: Brand[]; productCounts: Record<string, number> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState<Brand | null>(null);

  function run(action: () => Promise<BrandResult>, onDone?: () => void) {
    setError("");
    startTransition(async () => {
      const result = await action();
      if (!result.ok) { setError(result.error ?? "Something went wrong. Please try again."); return; }
      onDone?.();
      router.refresh();
    });
  }

  function removeDescription(brand: Brand): string {
    const count = productCounts[brand.id] ?? 0;
    return count > 0
      ? `Deleting "${brand.name}" also permanently removes ${count} product${count === 1 ? "" : "s"} and their stock history. Its locations become unassigned. This cannot be undone.`
      : `"${brand.name}" will be permanently deleted. This cannot be undone.`;
  }

  return <section className="portal-panel">
    <div className="panel-heading"><div><h2>Brands</h2><p>The brands that appear across the portal. Products in Inventory belong to a brand.</p></div></div>
    {error && <p className="folder-error" role="alert">{error}</p>}

    <form className="inv-form" onSubmit={e => { e.preventDefault(); if (!name.trim()) return; run(() => createBrand({ name }), () => setName("")); }}>
      <div className="admin-field"><label htmlFor="brand-name">Name</label><input id="brand-name" value={name} onChange={e => setName(e.target.value)} maxLength={120} placeholder="New brand" disabled={pending} required /></div>
      <button className="folder-add" disabled={pending || !name.trim()}><Plus size={16} /> Add brand</button>
    </form>

    <ul className="inv-list">
      {brands.length === 0 && <li className="inv-empty">No brands yet. Add one above.</li>}
      {brands.map(brand => editing?.id === brand.id ? <li key={brand.id} className="inv-row">
        <span className="inv-icon"><Sprout size={19} /></span>
        <div className="inv-edit">
          <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} maxLength={120} placeholder="Name" disabled={pending} aria-label="Brand name" />
          <button className="icon-btn" disabled={pending || !editing.name.trim()} onClick={() => run(() => updateBrand({ id: brand.id, name: editing.name }), () => setEditing(null))} aria-label="Save"><Check size={16} /></button>
          <button type="button" className="icon-btn" onClick={() => setEditing(null)} disabled={pending} aria-label="Cancel"><X size={16} /></button>
        </div>
      </li> : <li key={brand.id} className="inv-row">
        <span className="inv-icon"><Sprout size={19} /></span>
        <div className="inv-identity"><strong>{brand.name}</strong><span>{(productCounts[brand.id] ?? 0)} product{(productCounts[brand.id] ?? 0) === 1 ? "" : "s"}</span></div>
        <div className="inv-actions">
          <button type="button" className="icon-btn" onClick={() => { setError(""); setEditing({ id: brand.id, name: brand.name }); }} disabled={pending} aria-label={`Edit ${brand.name}`}><Pencil size={15} /></button>
          <button type="button" className="icon-btn danger" onClick={() => { setError(""); setRemoving(brand); }} disabled={pending} aria-label={`Delete ${brand.name}`}><Trash2 size={15} /></button>
        </div>
      </li>)}
    </ul>

    <ConfirmDelete
      open={!!removing}
      title="Delete this brand?"
      description={removing ? removeDescription(removing) : ""}
      confirmWord={removing?.name ?? ""}
      confirmLabel="Delete brand"
      pending={pending}
      onCancel={() => setRemoving(null)}
      onConfirm={() => { if (removing) run(() => deleteBrand({ id: removing.id }), () => setRemoving(null)); }}
    />
  </section>;
}
