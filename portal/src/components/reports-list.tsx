"use client";

import { useMemo, useState } from "react";
import { ClipboardList, FilePlus, FolderOpen } from "lucide-react";
import type { Machine } from "@/lib/portal/machine-types";
import { MODEL_LABELS, REPORT_STATUS_LABELS, type MaintenanceReport, type ReportSnapshot } from "@/lib/portal/maintenance-templates";
import { Select } from "./select";

// One report per machine. The Reports section lists every machine with its report;
// the Versions button opens the machine's assigned Documents folder (where its
// saved versions live). Machines with no folder set prompt the admin to assign one.
export function ReportsList({ machines, reports, snapshots, brandId, onOpenVersions }: {
  machines: Machine[];
  reports: MaintenanceReport[];
  snapshots: ReportSnapshot[];
  brandId: string;
  onOpenVersions: (machine: Machine) => void;
}) {
  const [sort, setSort] = useState("name-asc");

  const byMachine = useMemo(() => new Map(reports.map(r => [r.machineId, r])), [reports]);
  const versionCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of snapshots) map.set(s.machineId, (map.get(s.machineId) ?? 0) + 1);
    return map;
  }, [snapshots]);

  const byName = (a: Machine, b: Machine) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
  const STATUS_RANK: Record<string, number> = { out_of_service: 0, needs_maintenance: 1, waiting_parts: 2, operational: 3 };

  const visible = useMemo(() => {
    const arr = machines.filter(m => !brandId || m.brandId === brandId);
    if (sort === "name-desc") arr.sort((a, b) => byName(b, a));
    else if (sort === "edited") arr.sort((a, b) => (byMachine.get(b.id)?.updatedAt ?? "").localeCompare(byMachine.get(a.id)?.updatedAt ?? "") || byName(a, b));
    else if (sort === "status") arr.sort((a, b) => (STATUS_RANK[byMachine.get(a.id)?.machineStatus ?? ""] ?? 9) - (STATUS_RANK[byMachine.get(b.id)?.machineStatus ?? ""] ?? 9) || byName(a, b));
    else arr.sort(byName);
    return arr;
  }, [machines, brandId, sort, byMachine]);

  return <section className="portal-panel">
    <div className="panel-heading">
      <div><h2>Maintenance reports</h2><p>{visible.length} {visible.length === 1 ? "machine" : "machines"}{brandId ? " in this brand" : ""}. Tap a machine to open its current report, or start a new one.</p></div>
      <div className="list-sort"><label htmlFor="rep-sort">Sort</label><Select id="rep-sort" ariaLabel="Sort machines" className="ui-sort" value={sort} onChange={setSort} options={[
        { value: "name-asc", label: "Name (A-Z)" },
        { value: "name-desc", label: "Name (Z-A)" },
        { value: "edited", label: "Recently edited" },
        { value: "status", label: "Status" },
      ]} /></div>
    </div>
    <ul className="inv-list">
      {visible.length === 0 && <li className="inv-empty">No machines yet. Add a machine in Inventory → Machines to create its report.</li>}
      {visible.map(machine => {
        const report = byMachine.get(machine.id);
        const count = versionCount.get(machine.id) ?? 0;
        const hasFolder = !!machine.documentsFolderId;
        return <li key={machine.id} className="inv-row">
          <span className="inv-icon"><ClipboardList size={19} /></span>
          <div className="inv-identity">
            <strong><a className="report-name-link" href={`/m/${machine.id}?view=current`} title="Open the current report">{machine.name}</a></strong>
            <span>{machine.model ? MODEL_LABELS[machine.model] : "No model"}{machine.assetTag ? ` · ID ${machine.assetTag}` : ""}</span>
          </div>
          {report?.machineStatus
            ? <span className={`report-tag ${report.machineStatus}`}>{REPORT_STATUS_LABELS[report.machineStatus]}</span>
            : <span className="report-tag none">Not started</span>}
          <div className="inv-actions">
            {hasFolder
              ? <button type="button" className="inv-move-btn" onClick={() => onOpenVersions(machine)} title="Open saved versions in the assigned Documents folder"><FolderOpen size={15} /> Versions ({count})</button>
              : <a className="inv-move-btn" href={`/m/${machine.id}?view=current`} title="View saved versions on the report page (assign a Documents folder in Inventory → Machines to open them there)"><FolderOpen size={15} /> Versions ({count})</a>}
            <a className="inv-move-btn" href={`/m/${machine.id}`}><FilePlus size={15} /> New report</a>
          </div>
        </li>;
      })}
    </ul>
  </section>;
}
