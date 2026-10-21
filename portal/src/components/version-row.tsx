"use client";

import { FileDown, Trash2 } from "lucide-react";
import { TEMPLATES, type ReportSnapshot, type CheckState, type MachineModel } from "@/lib/portal/maintenance-templates";
import { REPORT_TEXT, type Lang } from "@/lib/portal/report-i18n";
import { downloadReportPdf } from "@/lib/portal/report-pdf";

// A read-only, expandable saved version (snapshot). Shown on the machine report
// page and in the portal Reports section. Optional admin delete.
export function VersionRow({ version, machine, isAdmin, pending, onDelete, lang = "en" }: {
  version: ReportSnapshot;
  machine: { name: string; model: MachineModel | null; assetTag: string | null; location: string | null };
  isAdmin: boolean;
  pending: boolean;
  onDelete: () => void;
  lang?: Lang;
}) {
  const t = REPORT_TEXT[lang];
  const ar = lang === "ar";
  const template = TEMPLATES[version.model];
  const labels = new Map(template.checklist.map(i => [i.key, ar ? i.ar : i.label]));
  const testLabels = new Map(template.functionTests.map(f => [f.key, ar ? f.ar : f.label]));
  const flagged = Object.entries(version.checklist).filter(([, e]) => e.state || e.note);
  const passed = template.functionTests.filter(f => version.functionTest[f.key]);

  return <details className="mr-report">
    <summary>
      <span className="mr-report-date" dir="ltr">{version.savedAt.slice(0, 16).replace("T", " ")}</span>
      <span className="mr-report-meta">
        {version.maintenanceType && <em>{t.types[version.maintenanceType]}</em>}
        {version.machineStatus && <em className="mr-status-tag">{t.statuses[version.machineStatus]}</em>}
        <span>{version.technicianName ?? "-"}</span>
      </span>
    </summary>
    <div className="mr-report-body">
      {flagged.length > 0 && <div className="mr-report-block">
        <h4>{t.vChecklist}</h4>
        <ul className="v-items">{flagged.map(([key, e]) => <li key={key} className="v-item">
          <div className="v-item-head">
            <span className="v-item-label">{labels.get(key) ?? key}</span>
            {e.state && <span className={`mr-state-tag ${e.state}`}>{t.states[e.state as CheckState]}</span>}
          </div>
          {e.note && <p className="v-item-note" dir="auto">{e.note}</p>}
        </li>)}</ul>
      </div>}
      {passed.length > 0 && <div className="mr-report-block"><h4>{t.vTests}</h4><p>{passed.map(f => testLabels.get(f.key)).join(" · ")}</p></div>}
      {version.problemFound && <div className="mr-report-block"><h4>{t.problem}</h4><p dir="auto">{version.problemFound}</p></div>}
      {version.workPerformed && <div className="mr-report-block"><h4>{t.work}</h4><p dir="auto">{version.workPerformed}</p></div>}
      {version.partsReplaced && <div className="mr-report-block"><h4>{t.replaced}</h4><p dir="auto">{version.partsReplaced}</p></div>}
      {version.partsRequired && <div className="mr-report-block"><h4>{t.required}</h4><p dir="auto">{version.partsRequired}</p></div>}
      <div className="mr-report-foot">
        {version.operatingHours && <span>{t.vHours}: {version.operatingHours}</span>}
        {version.siteLocation && <span>{t.vSite}: {version.siteLocation}</span>}
        {version.nextMaintenance && <span>{t.vNext}: {version.nextMaintenance}</span>}
        <span className="mr-foot-actions">
          <button type="button" className="mr-pdf" onClick={() => downloadReportPdf(machine, version)}><FileDown size={13} /> PDF</button>
          {isAdmin && <button type="button" className="icon-btn danger" onClick={onDelete} disabled={pending} aria-label={t.deleteVersion}><Trash2 size={14} /></button>}
        </span>
      </div>
    </div>
  </details>;
}
