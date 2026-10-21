"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Cpu, FileDown, History, Trash2 } from "lucide-react";
import { MaintenanceReportForm } from "./maintenance-report-form";
import { BackButton } from "./back-button";
import { VersionRow } from "./version-row";
import { deleteMaintenanceReport, deleteReportSnapshot } from "@/lib/portal/maintenance";
import { downloadReportPdf } from "@/lib/portal/report-pdf";
import { type Machine } from "@/lib/portal/machine-types";
import { TEMPLATES, type MaintenanceReport, type ReportSnapshot } from "@/lib/portal/maintenance-templates";
import { LANG_KEY, REPORT_TEXT, type Lang } from "@/lib/portal/report-i18n";

export function MachineState({ machine, report, versions, defaultTechnician, isAdmin, startNew = false }: {
  machine: Machine;
  report: MaintenanceReport | null;
  versions: ReportSnapshot[];
  defaultTechnician: string;
  isAdmin: boolean;
  startNew?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const template = machine.model ? TEMPLATES[machine.model] : null;
  // Arabic by default, like the paper forms; the technician's choice is remembered.
  const [lang, setLang] = useState<Lang>("ar");
  useEffect(() => {
    try { if (localStorage.getItem(LANG_KEY) === "en") setLang("en"); } catch { /* storage unavailable: keep Arabic */ }
  }, []);
  function chooseLang(next: Lang) {
    setLang(next);
    try { localStorage.setItem(LANG_KEY, next); } catch { /* not remembered, still switched */ }
  }
  const t = REPORT_TEXT[lang];
  const ar = lang === "ar";

  function removeReport() {
    if (!report || !window.confirm(t.confirmDeleteReport)) return;
    startTransition(async () => {
      await deleteMaintenanceReport({ id: report.id });
      router.refresh();
    });
  }

  function removeVersion(id: string) {
    if (!window.confirm(t.confirmDeleteVersion)) return;
    startTransition(async () => {
      await deleteReportSnapshot({ id });
      router.refresh();
    });
  }

  return <div className="machine-card wide" dir={ar ? "rtl" : "ltr"} lang={lang}>
    <div className="mr-top">
      {/* Previous page; opened straight from a QR scan, it goes to the Reports list. */}
      <BackButton className="mr-back" fallback="/portal?section=Reports">{ar ? <ArrowRight size={16} /> : <ArrowLeft size={16} />} {t.back}</BackButton>
      <div className="mr-lang" role="group" aria-label="Language / اللغة">
        <button type="button" className={ar ? "on" : ""} aria-pressed={ar} onClick={() => chooseLang("ar")} lang="ar">عربي</button>
        <button type="button" className={ar ? "" : "on"} aria-pressed={!ar} onClick={() => chooseLang("en")} lang="en">EN</button>
      </div>
    </div>
    <span className="machine-icon"><Cpu size={26} /></span>
    <p className="eyebrow">{t.eyebrow}</p>
    <h1><bdi>{machine.name}</bdi></h1>
    <p className="machine-loc">
      <bdi>{machine.model ? t.model[machine.model] : t.noModel}</bdi>
      {machine.assetTag && <> · {t.id} <bdi>{machine.assetTag}</bdi></>}
      {machine.location && <> · <bdi>{machine.location}</bdi></>}
    </p>
    <span className={`status-badge big ${machine.status}`}>{t.machineStatus[machine.status]}</span>

    <div className="mr-meta-line">
      {startNew
        ? <span className="mr-meta-text"><small>{t.newReport}</small><span>{t.newReportHint}</span></span>
        : report?.updatedAt
          ? <span className="mr-meta-text"><small>{t.lastEdited}</small><span><bdi dir="ltr">{report.updatedAt.slice(0, 16).replace("T", " ")}</bdi>{report.technicianName ? <> · <bdi>{report.technicianName}</bdi></> : ""}</span></span>
          : <span className="mr-meta-text"><small>{t.newReport}</small><span>{t.notSaved}</span></span>}
      {!startNew && <span className="mr-foot-actions">
        {template && <button type="button" className="mr-pdf" onClick={() => downloadReportPdf(machine, report)}><FileDown size={13} /> PDF</button>}
        {isAdmin && report && <button type="button" className="icon-btn danger" onClick={removeReport} disabled={pending} aria-label={t.deleteReport}><Trash2 size={15} /></button>}
      </span>}
    </div>

    {!template
      ? <p className="machine-notice">{t.noTemplate}</p>
      : <MaintenanceReportForm key={startNew ? "new" : "current"} machine={machine} template={template} defaultTechnician={defaultTechnician} initial={startNew ? null : report} isNew={startNew} lang={lang} />}

    {template && <div className="mr-history">
      <div className="mr-history-head"><History size={17} /> <strong>{t.savedVersions}</strong><span>{versions.length}</span></div>
      {versions.length === 0 ? <p className="mr-history-empty">{t.noVersions}</p>
        : versions.map(version => <VersionRow key={version.id} version={version} machine={machine} isAdmin={isAdmin} pending={pending} onDelete={() => removeVersion(version.id)} lang={lang} />)}
    </div>}

    <BackButton className="text-link machine-back" fallback="/portal?section=Reports">{t.back}</BackButton>
  </div>;
}
