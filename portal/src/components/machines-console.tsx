"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Check, Cpu, FolderPlus, Pencil, Plus, Printer, QrCode, Trash2, X } from "lucide-react";
import { createMachine, deleteMachine, ensureAllReportFolders, updateMachine } from "@/lib/portal/machines";
import { MACHINE_STATUSES, STATUS_LABELS, type Machine, type MachineResult } from "@/lib/portal/machine-types";
import { MACHINE_MODELS, MODEL_LABELS, type MachineModel } from "@/lib/portal/maintenance-templates";
import { Select } from "./select";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "";

type Brand = { id: string; name: string };

export function MachinesConsole({ machines, isAdmin, brands, brandId }: { machines: Machine[]; isAdmin: boolean; brands: Brand[]; brandId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("running");
  const [brand, setBrand] = useState(brandId || brands[0]?.id || "");
  const [model, setModel] = useState<MachineModel>("walk_behind_scrubber");
  const [assetTag, setAssetTag] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string; location: string; model: MachineModel; assetTag: string } | null>(null);
  const needsFolders = machines.some(m => !m.documentsFolderId);
  const [qr, setQr] = useState<Machine | null>(null);
  const [adding, setAdding] = useState(false);

  const brandName = (id: string | null) => brands.find(b => b.id === id)?.name ?? "Unassigned";
  const visibleMachines = machines.filter(m => !brandId || m.brandId === brandId)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));

  function run(action: () => Promise<MachineResult>, onDone?: () => void) {
    setError("");
    startTransition(async () => {
      const result = await action();
      if (!result.ok) { setError(result.error ?? "Something went wrong. Please try again."); return; }
      onDone?.();
      router.refresh();
    });
  }

  const qrUrl = qr ? `${SITE || (typeof window !== "undefined" ? window.location.origin : "")}/m/${qr.id}` : "";

  return <div className="machines">
    {error && !adding && <p className="folder-error" role="alert">{error}</p>}

    <section className="portal-panel">
      <div className="panel-heading">
        <div><h2>Machines</h2><p>{visibleMachines.length} {visibleMachines.length === 1 ? "machine" : "machines"}{brandId ? " in this brand" : ""}</p></div>
        {isAdmin && <div className="panel-actions">
          {needsFolders && <button type="button" className="inv-move-btn" onClick={() => { setError(""); run(() => ensureAllReportFolders()); }} disabled={pending} title="Create the Documents report folders for existing machines"><FolderPlus size={15} /> Set up report folders</button>}
          <button type="button" className="folder-add" onClick={() => { setError(""); setAdding(true); }}><Plus size={16} /> Add machine</button>
        </div>}
      </div>
      <ul className="inv-list">
        {visibleMachines.length === 0 && <li className="inv-empty">No machines yet. Add one above.</li>}
        {visibleMachines.map(machine => editing?.id === machine.id ? <li key={machine.id} className="inv-row">
          <span className="inv-icon"><Cpu size={19} /></span>
          <div className="inv-edit">
            <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} maxLength={160} placeholder="Name" disabled={pending} aria-label="Machine name" />
            <Select ariaLabel="Model" value={editing.model} onChange={v => setEditing({ ...editing, model: v as MachineModel })} disabled={pending} options={MACHINE_MODELS.map(m => ({ value: m, label: MODEL_LABELS[m] }))} />
            <input value={editing.assetTag} onChange={e => setEditing({ ...editing, assetTag: e.target.value })} maxLength={80} placeholder="Machine ID" disabled={pending} aria-label="Machine ID" />
            <input value={editing.location} onChange={e => setEditing({ ...editing, location: e.target.value })} maxLength={160} placeholder="Location" disabled={pending} aria-label="Location" />
            <button className="icon-btn" disabled={pending || !editing.name.trim()} onClick={() => run(() => updateMachine({ id: machine.id, name: editing.name, location: editing.location || null, model: editing.model, assetTag: editing.assetTag || null }), () => setEditing(null))} aria-label="Save"><Check size={16} /></button>
            <button type="button" className="icon-btn" onClick={() => setEditing(null)} disabled={pending} aria-label="Cancel"><X size={16} /></button>
          </div>
        </li> : <li key={machine.id} className="inv-row">
          <span className="inv-icon"><Cpu size={19} /></span>
          <div className="inv-identity"><strong>{machine.name}</strong><span>{machine.model ? MODEL_LABELS[machine.model] : "No model"} · {brandName(machine.brandId)}{machine.location ? ` · ${machine.location}` : ""}</span></div>
          <span className={`status-badge ${machine.status}`}>{STATUS_LABELS[machine.status]}</span>
          <div className="inv-actions">
            {isAdmin ? <>
              <button type="button" className="inv-move-btn" onClick={() => setQr(machine)} disabled={pending}><QrCode size={15} /> QR</button>
              <button type="button" className="icon-btn" onClick={() => { setError(""); setEditing({ id: machine.id, name: machine.name, location: machine.location ?? "", model: machine.model ?? "walk_behind_scrubber", assetTag: machine.assetTag ?? "" }); }} disabled={pending} aria-label={`Edit ${machine.name}`}><Pencil size={15} /></button>
              <button type="button" className="icon-btn danger" onClick={() => { if (window.confirm(`Are you sure you want to delete "${machine.name}"? This cannot be undone.`)) run(() => deleteMachine({ id: machine.id })); }} disabled={pending} aria-label={`Delete ${machine.name}`}><Trash2 size={15} /></button>
            </> : <a className="inv-move-btn" href={`/m/${machine.id}?view=current`}>View report</a>}
          </div>
        </li>)}
      </ul>
    </section>

    {qr && <div className="qr-overlay" role="dialog" aria-modal="true" aria-label={`QR code for ${qr.name}`}>
      <div className="qr-dialog">
        <div className="qr-print">
          <QRCodeSVG value={qrUrl} size={220} level="M" marginSize={2} />
          <strong>{qr.name}</strong>
          {qr.model && <span>{MODEL_LABELS[qr.model]}</span>}
          {qr.assetTag && <span>ID {qr.assetTag}</span>}
          {qr.location && <span>{qr.location}</span>}
          <small>Scan to open the maintenance report</small>
        </div>
        <p className="qr-url">{qrUrl}</p>
        <div className="qr-buttons">
          <button type="button" className="folder-add" onClick={() => window.print()}><Printer size={16} /> Print</button>
          <button type="button" className="qr-close" onClick={() => setQr(null)}>Close</button>
        </div>
      </div>
    </div>}

    {adding && <div className="mc-overlay" role="dialog" aria-modal="true" aria-label="Add a machine" onMouseDown={e => { if (e.target === e.currentTarget && !pending) setAdding(false); }}>
      <form className="mc-dialog" onSubmit={e => { e.preventDefault(); if (!name.trim() || !brand) return; run(() => createMachine({ name, location: location || null, status, brandId: brand, model, assetTag: assetTag || null }), () => { setName(""); setLocation(""); setStatus("running"); setAssetTag(""); setAdding(false); }); }}>
        <div className="mc-dialog-head"><h3>Add a machine</h3><p>A folder for this machine's saved report versions is created automatically under Documents → Machine Reports.</p></div>
        <div className="admin-field"><label htmlFor="mc-name">Name</label><input id="mc-name" value={name} onChange={e => setName(e.target.value)} maxLength={160} placeholder="Packing line 1" disabled={pending} autoFocus required /></div>
        <div className="admin-field"><label htmlFor="mc-model">Model</label><Select id="mc-model" ariaLabel="Model" value={model} onChange={v => setModel(v as MachineModel)} disabled={pending} options={MACHINE_MODELS.map(m => ({ value: m, label: MODEL_LABELS[m] }))} /></div>
        <div className="admin-field"><label htmlFor="mc-brand">Brand</label><Select id="mc-brand" ariaLabel="Brand" value={brand} onChange={setBrand} disabled={pending} options={brands.map(b => ({ value: b.id, label: b.name }))} /></div>
        <div className="admin-field"><label htmlFor="mc-asset">Machine ID <span className="opt">(optional)</span></label><input id="mc-asset" value={assetTag} onChange={e => setAssetTag(e.target.value)} maxLength={80} placeholder="Serial / asset tag" disabled={pending} /></div>
        <div className="admin-field"><label htmlFor="mc-loc">Location <span className="opt">(optional)</span></label><input id="mc-loc" value={location} onChange={e => setLocation(e.target.value)} maxLength={160} placeholder="Warehouse A" disabled={pending} /></div>
        <div className="admin-field"><label htmlFor="mc-status">Status</label><Select id="mc-status" ariaLabel="Status" value={status} onChange={setStatus} disabled={pending} options={MACHINE_STATUSES.map(s => ({ value: s, label: STATUS_LABELS[s] }))} /></div>
        {error && <p className="folder-error" role="alert">{error}</p>}
        <div className="mc-actions">
          <button type="button" className="qr-close" onClick={() => setAdding(false)} disabled={pending}>Cancel</button>
          <button type="submit" className="folder-add" disabled={pending || !name.trim() || !brand}><Plus size={16} /> Add machine</button>
        </div>
      </form>
    </div>}
  </div>;
}
