"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Check, ClipboardList, Folder, FolderPlus, Pencil, Trash2, X } from "lucide-react";
import { createFolder, deleteFolder, moveFolder, renameFolder } from "@/lib/portal/folders";
import { deleteReportSnapshot } from "@/lib/portal/maintenance";
import type { Folder as FolderRow, FolderModule, FolderResult } from "@/lib/portal/folder-types";
import type { Machine } from "@/lib/portal/machine-types";
import type { ReportSnapshot } from "@/lib/portal/maintenance-templates";
import { VersionRow } from "./version-row";
import { Select } from "./select";

export function FolderBrowser({ module, folders, brandId, machines = [], snapshots = [], isAdmin = false, initialFolderId = null }: { module: FolderModule; folders: FolderRow[]; brandId: string; machines?: Machine[]; snapshots?: ReportSnapshot[]; isAdmin?: boolean; initialFolderId?: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [currentId, setCurrentId] = useState<string | null>(initialFolderId ?? null);

  const snapsByMachine = useMemo(() => {
    const map = new Map<string, ReportSnapshot[]>();
    for (const s of snapshots) { const l = map.get(s.machineId) ?? []; l.push(s); map.set(s.machineId, l); }
    return map;
  }, [snapshots]);
  // Machines linked to each folder, so a machine's folder isn't labelled "Empty".
  const machinesByFolder = useMemo(() => {
    const map = new Map<string, Machine[]>();
    for (const mc of machines) if (mc.documentsFolderId) { const l = map.get(mc.documentsFolderId) ?? []; l.push(mc); map.set(mc.documentsFolderId, l); }
    return map;
  }, [machines]);

  function folderMeta(folderId: string, subCount: number): string {
    const parts: string[] = [];
    if (subCount) parts.push(`${subCount} ${subCount === 1 ? "subfolder" : "subfolders"}`);
    const linked = machinesByFolder.get(folderId) ?? [];
    if (linked.length) {
      const n = linked.reduce((sum, mc) => sum + (snapsByMachine.get(mc.id)?.length ?? 0), 0);
      parts.push(n ? `${n} saved ${n === 1 ? "version" : "versions"}` : "No saved versions yet");
    }
    return parts.join(" · ") || "Empty";
  }

  function removeVersion(id: string) {
    if (!window.confirm("Are you sure you want to delete this saved version? This cannot be undone.")) return;
    startTransition(async () => { await deleteReportSnapshot({ id }); router.refresh(); });
  }
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [moving, setMoving] = useState<{ id: string; parentId: string } | null>(null);
  const [error, setError] = useState("");

  const moduleLabel = module.charAt(0).toUpperCase() + module.slice(1);
  const byId = useMemo(() => new Map(folders.map(folder => [folder.id, folder])), [folders]);
  const activeId = currentId && byId.has(currentId) ? currentId : null;
  const children = folders.filter(folder => folder.parent_id === activeId).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
  // Machines whose saved report versions belong in the folder currently open.
  const machinesHere = activeId ? machines.filter(m => m.documentsFolderId === activeId) : [];

  const path = useMemo(() => {
    const chain: FolderRow[] = [];
    let cursor: string | null = activeId;
    while (cursor) { const folder = byId.get(cursor); if (!folder) break; chain.unshift(folder); cursor = folder.parent_id; }
    return chain;
  }, [activeId, byId]);

  function pathLabel(id: string): string {
    const parts: string[] = [];
    let cursor: string | null = id;
    while (cursor) { const folder = byId.get(cursor); if (!folder) break; parts.unshift(folder.name); cursor = folder.parent_id; }
    return parts.join(" / ");
  }

  function moveTargets(id: string): FolderRow[] {
    const blocked = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const folder of folders) if (folder.parent_id && blocked.has(folder.parent_id) && !blocked.has(folder.id)) { blocked.add(folder.id); changed = true; }
    }
    return folders.filter(folder => !blocked.has(folder.id)).sort((a, b) => pathLabel(a.id).localeCompare(pathLabel(b.id)));
  }

  function run(action: () => Promise<FolderResult>, onDone?: () => void) {
    setError("");
    startTransition(async () => {
      const result = await action();
      if (!result.ok) { setError(result.error ?? "Something went wrong. Please try again."); return; }
      onDone?.();
      router.refresh();
    });
  }

  function submitCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!newName.trim()) return;
    // Top-level folders use the Brand selected at the top of the page.
    // Subfolders inherit their parent's brand.
    const folderBrand = activeId ? null : (brandId || null);
    if (!activeId && !folderBrand) { setError("Choose a brand in the Brand menu above to add a folder here."); return; }
    run(() => createFolder({ module, name: newName, parentId: activeId, brandId: folderBrand }), () => setNewName(""));
  }

  function onDelete(folder: FolderRow) {
    const hasChildren = folders.some(child => child.parent_id === folder.id);
    const message = `Are you sure you want to delete "${folder.name}"${hasChildren ? " and everything inside it" : ""}? This cannot be undone.`;
    if (!window.confirm(message)) return;
    run(() => deleteFolder({ id: folder.id }));
  }

  return <section className="portal-panel folder-browser">
    <div className="folder-bar">
      <nav className="folder-breadcrumb" aria-label="Folder path">
        <button type="button" className={activeId ? "" : "current"} disabled={!activeId || pending} onClick={() => setCurrentId(null)}>{moduleLabel} home</button>
        {path.map(folder => <span key={folder.id}><span className="sep" aria-hidden="true">/</span><button type="button" className={folder.id === activeId ? "current" : ""} disabled={pending} onClick={() => setCurrentId(folder.id)}>{folder.name}</button></span>)}
      </nav>
      {/* A machine's own report folder holds its versions, not subfolders. */}
      {machinesHere.length === 0 && (!brandId && !activeId
        ? <p className="folder-brand-hint">Pick a brand in the Brand menu above to add a folder.</p>
        : <form className="folder-new" onSubmit={submitCreate}>
          <input value={newName} onChange={event => setNewName(event.target.value)} placeholder="New folder name" maxLength={120} disabled={pending} aria-label={`New ${moduleLabel.toLowerCase()} folder name`} />
          <button className="folder-add" disabled={pending || !newName.trim()}><FolderPlus size={16} /> Add folder</button>
        </form>)}
    </div>

    {error && <p className="folder-error" role="alert">{error}</p>}

    {children.length === 0 && machinesHere.length === 0 && <div className="folder-empty">
      <span className="folder-empty-icon"><Folder size={26} strokeWidth={1.4} /></span>
      <p>No folders here yet.</p>
      <small>{activeId ? "Add a subfolder above, or move folders in from elsewhere." : `Create your first ${moduleLabel.toLowerCase()} folder above.`}</small>
    </div>}
    {children.length > 0 && <ul className="folder-list">
      {children.map(folder => {
        const subCount = folders.filter(child => child.parent_id === folder.id).length;
        if (renaming?.id === folder.id) return <li key={folder.id} className="folder-row">
          <span className="folder-icon"><Folder size={20} /></span>
          <form className="folder-inline" onSubmit={event => { event.preventDefault(); run(() => renameFolder({ id: folder.id, name: renaming.name }), () => setRenaming(null)); }}>
            <input autoFocus value={renaming.name} onChange={event => setRenaming({ id: folder.id, name: event.target.value })} maxLength={120} disabled={pending} aria-label="Folder name" />
            <button className="icon-btn" disabled={pending || !renaming.name.trim()} aria-label="Save name"><Check size={16} /></button>
            <button type="button" className="icon-btn" onClick={() => setRenaming(null)} disabled={pending} aria-label="Cancel rename"><X size={16} /></button>
          </form>
        </li>;
        if (moving?.id === folder.id) return <li key={folder.id} className="folder-row">
          <span className="folder-icon"><ArrowRightLeft size={20} /></span>
          <div className="folder-inline">
            <Select value={moving.parentId} onChange={v => setMoving({ id: folder.id, parentId: v })} disabled={pending} ariaLabel={`Move ${folder.name} to`}
              options={[{ value: "", label: `${moduleLabel} home (top level)` }, ...moveTargets(folder.id).map(target => ({ value: target.id, label: pathLabel(target.id) }))]} />
            <button type="button" className="icon-btn" onClick={() => run(() => moveFolder({ id: folder.id, parentId: moving.parentId || null }), () => setMoving(null))} disabled={pending} aria-label="Confirm move"><Check size={16} /></button>
            <button type="button" className="icon-btn" onClick={() => setMoving(null)} disabled={pending} aria-label="Cancel move"><X size={16} /></button>
          </div>
        </li>;
        return <li key={folder.id} className="folder-row">
          <span className="folder-icon"><Folder size={20} /></span>
          <button type="button" className="folder-open" onClick={() => setCurrentId(folder.id)} disabled={pending}>
            <span className="folder-name">{folder.name}</span>
            <span className="folder-meta">{folderMeta(folder.id, subCount)}</span>
          </button>
          <div className="folder-actions">
            <button type="button" className="icon-btn" onClick={() => { setError(""); setMoving(null); setRenaming({ id: folder.id, name: folder.name }); }} disabled={pending} aria-label={`Rename ${folder.name}`}><Pencil size={15} /></button>
            <button type="button" className="icon-btn" onClick={() => { setError(""); setRenaming(null); setMoving({ id: folder.id, parentId: folder.parent_id ?? "" }); }} disabled={pending} aria-label={`Move ${folder.name}`}><ArrowRightLeft size={15} /></button>
            <button type="button" className="icon-btn danger" onClick={() => onDelete(folder)} disabled={pending} aria-label={`Delete ${folder.name}`}><Trash2 size={15} /></button>
          </div>
        </li>;
      })}
    </ul>}

    {machinesHere.length > 0 && <div className="folder-reports">
      {machinesHere.map(m => {
        const versions = snapsByMachine.get(m.id) ?? [];
        return <div className="folder-report-machine" key={m.id}>
          <div className="folder-report-head">
            <ClipboardList size={16} />
            <div className="folder-report-title"><strong>{m.name}</strong><span>{versions.length} saved {versions.length === 1 ? "version" : "versions"}</span></div>
          </div>
          {versions.length === 0 ? <p className="mr-history-empty">No saved versions yet for this machine.</p>
            : versions.map(v => <VersionRow key={v.id} version={v} machine={m} isAdmin={isAdmin} pending={pending} onDelete={() => removeVersion(v.id)} />)}
        </div>;
      })}
    </div>}
  </section>;
}
