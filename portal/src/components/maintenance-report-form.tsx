"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, MessageSquarePlus, MessageSquareText } from "lucide-react";
import { saveMaintenanceReport } from "@/lib/portal/maintenance";
import { MAINTENANCE_TYPES, REPORT_STATUSES, type Template, type MaintenanceReport } from "@/lib/portal/maintenance-templates";
import { REPORT_TEXT, type Lang } from "@/lib/portal/report-i18n";
import type { Machine } from "@/lib/portal/machine-types";
import { DateInput } from "./date-input";

type Entry = { state?: string; note?: string };

export function MaintenanceReportForm({ machine, template, defaultTechnician, initial, isNew = false, lang = "en" }: {
  machine: Machine;
  template: Template;
  defaultTechnician: string;
  initial: MaintenanceReport | null;
  isNew?: boolean;
  lang?: Lang;
}) {
  const t = REPORT_TEXT[lang];
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [technician, setTechnician] = useState(initial?.technicianName ?? defaultTechnician);
  const [reportDate, setReportDate] = useState(initial?.reportDate ?? new Date().toISOString().slice(0, 10));
  const [maintenanceType, setMaintenanceType] = useState<string>(initial?.maintenanceType ?? "");
  const [operatingHours, setOperatingHours] = useState(initial?.operatingHours ?? "");
  const [siteLocation, setSiteLocation] = useState(initial?.siteLocation ?? machine.location ?? "");
  const [checklist, setChecklist] = useState<Record<string, Entry>>(initial?.checklist ?? {});
  const [functionTest, setFunctionTest] = useState<Record<string, boolean>>(initial?.functionTest ?? {});
  const [problemFound, setProblemFound] = useState(initial?.problemFound ?? "");
  const [workPerformed, setWorkPerformed] = useState(initial?.workPerformed ?? "");
  const [partsReplaced, setPartsReplaced] = useState(initial?.partsReplaced ?? "");
  const [partsRequired, setPartsRequired] = useState(initial?.partsRequired ?? "");
  const [nextMaintenance, setNextMaintenance] = useState(initial?.nextMaintenance ?? "");
  const [machineStatus, setMachineStatus] = useState<string>(initial?.machineStatus ?? "");
  // Note fields stay hidden until asked for (or when a note already exists).
  const [openNotes, setOpenNotes] = useState<Set<string>>(() => new Set(Object.entries(initial?.checklist ?? {}).filter(([, e]) => e.note).map(([k]) => k)));

  function touch() { setSaved(false); }
  function setState(key: string, state: string) {
    touch();
    setChecklist(prev => {
      const cur = prev[key] ?? {};
      return { ...prev, [key]: { ...cur, state: cur.state === state ? undefined : state } };
    });
  }
  function setNote(key: string, note: string) {
    touch();
    setChecklist(prev => ({ ...prev, [key]: { ...(prev[key] ?? {}), note } }));
  }
  function openNote(key: string) { setOpenNotes(prev => new Set(prev).add(key)); }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await saveMaintenanceReport({
        machineId: machine.id,
        reportDate,
        maintenanceType: maintenanceType || null,
        operatingHours: operatingHours || null,
        siteLocation: siteLocation || null,
        machineStatus: machineStatus || null,
        problemFound: problemFound || null,
        workPerformed: workPerformed || null,
        partsReplaced: partsReplaced || null,
        partsRequired: partsRequired || null,
        nextMaintenance: nextMaintenance || null,
        technicianName: technician || null,
        checklist,
        functionTest,
        archivePrevious: isNew,
      });
      if (!result.ok) { setError(result.error ?? t.saveError); return; }
      setSaved(true);
      // Switch to the saved report so a reload shows it (not another blank one),
      // and further saves update this report instead of starting a new one.
      router.replace(`${pathname}?view=current`);
      router.refresh();
    });
  }

  const ar = lang === "ar";
  const stateLabels = template.columns.map(c => t.states[c]);
  // Arabic shows the form's Arabic wording with the English underneath, like the paper.
  const itemLabel = (item: { label: string; ar: string }) => ar ? item.ar : item.label;

  return <form className="mr-form" onSubmit={submit}>
    <section className="mr-block">
      <h3 className="mr-block-title">{t.details}</h3>
      <div className="mr-grid">
        <label className="mr-field"><span>{t.technician}</span><input dir="auto" value={technician} onChange={e => { touch(); setTechnician(e.target.value); }} maxLength={160} disabled={pending} required /></label>
        <label className="mr-field"><span>{t.date}</span><DateInput value={reportDate} onChange={v => { touch(); setReportDate(v); }} placeholder={t.chooseDate} disabled={pending} required /></label>
        <label className="mr-field"><span>{t.hours}</span><input dir="auto" value={operatingHours} onChange={e => { touch(); setOperatingHours(e.target.value); }} maxLength={40} inputMode="numeric" placeholder={t.hoursHint} disabled={pending} /></label>
        <label className="mr-field"><span>{t.site}</span><input dir="auto" value={siteLocation} onChange={e => { touch(); setSiteLocation(e.target.value); }} maxLength={200} disabled={pending} /></label>
      </div>
      <div className="mr-sub">{t.type}</div>
      <div className="mr-seg mr-seg-full" role="group" aria-label={t.type}>
        {MAINTENANCE_TYPES.map(m => <button type="button" key={m} className={`mr-seg-btn pick ${maintenanceType === m ? "on" : ""}`} disabled={pending} aria-pressed={maintenanceType === m} onClick={() => { touch(); setMaintenanceType(maintenanceType === m ? "" : m); }}>{t.types[m]}</button>)}
      </div>
    </section>

    <section className="mr-block">
      <h3 className="mr-block-title">{t.checklist}</h3>
      <p className="mr-block-sub">{t.markHint(stateLabels)}{template.columns.includes("ok") ? "" : ` ${t.blankHint}`}</p>
      <div className="mr-items">
        {template.checklist.map(item => {
          const entry = checklist[item.key] ?? {};
          const noteShown = openNotes.has(item.key) || !!entry.note;
          return <div className="mr-item" key={item.key}>
            <div className="mr-item-main">
              <span className="mr-item-label">{itemLabel(item)}{ar && <small className="mr-item-en" dir="ltr">{item.label}</small>}</span>
              <div className="mr-item-controls">
                <div className="mr-seg" role="group" aria-label={itemLabel(item)}>
                  {template.columns.map(s => <button type="button" key={s} className={`mr-seg-btn ${s} ${entry.state === s ? "on" : ""}`} disabled={pending} onClick={() => setState(item.key, s)} aria-pressed={entry.state === s}>{t.states[s]}</button>)}
                </div>
                <button type="button" className={`mr-note-btn ${noteShown ? "on" : ""}`} disabled={pending || noteShown} onClick={() => openNote(item.key)} aria-label={t.noteFor(itemLabel(item))} title={t.addNote}>
                  {noteShown ? <MessageSquareText size={16} /> : <MessageSquarePlus size={16} />}
                </button>
              </div>
            </div>
            {noteShown && <input className="mr-note" dir="auto" value={entry.note ?? ""} onChange={e => setNote(item.key, e.target.value)} maxLength={300} placeholder={t.note} disabled={pending} autoFocus={!entry.note} aria-label={`${itemLabel(item)} - ${t.note}`} />}
          </div>;
        })}
      </div>
    </section>

    <section className="mr-block">
      <h3 className="mr-block-title">{t.functionTest}</h3>
      <div className="mr-tiles" role="group" aria-label={t.functionTest}>
        {template.functionTests.map(test => {
          const on = !!functionTest[test.key];
          return <button type="button" key={test.key} className={`mr-tile ${on ? "on" : ""}`} disabled={pending} aria-pressed={on} onClick={() => { touch(); setFunctionTest(prev => ({ ...prev, [test.key]: !prev[test.key] })); }}>
            <span className="mr-box" aria-hidden="true">{on && <Check size={13} strokeWidth={3} />}</span>{itemLabel(test)}
          </button>;
        })}
      </div>
    </section>

    <section className="mr-block">
      <h3 className="mr-block-title">{t.findings}</h3>
      <div className="mr-grid">
        <label className="mr-field"><span>{t.problem}</span><textarea dir="auto" value={problemFound} onChange={e => { touch(); setProblemFound(e.target.value); }} maxLength={4000} rows={2} disabled={pending} /></label>
        <label className="mr-field"><span>{t.work}</span><textarea dir="auto" value={workPerformed} onChange={e => { touch(); setWorkPerformed(e.target.value); }} maxLength={4000} rows={2} disabled={pending} /></label>
        <label className="mr-field"><span>{t.replaced}</span><textarea dir="auto" value={partsReplaced} onChange={e => { touch(); setPartsReplaced(e.target.value); }} maxLength={4000} rows={2} disabled={pending} /></label>
        <label className="mr-field"><span>{t.required}</span><textarea dir="auto" value={partsRequired} onChange={e => { touch(); setPartsRequired(e.target.value); }} maxLength={4000} rows={2} disabled={pending} /></label>
      </div>
    </section>

    <section className="mr-block">
      <h3 className="mr-block-title">{t.outcome}</h3>
      <div className="mr-sub">{t.status}</div>
      <div className="mr-tiles mr-tiles-2" role="radiogroup" aria-label={t.status}>
        {REPORT_STATUSES.map(s => <button type="button" key={s} role="radio" aria-checked={machineStatus === s} className={`mr-tile status ${s} ${machineStatus === s ? "on" : ""}`} disabled={pending} onClick={() => { touch(); setMachineStatus(machineStatus === s ? "" : s); }}>
          <span className="mr-dot" aria-hidden="true" />{t.statuses[s]}
        </button>)}
      </div>
      <div className="mr-grid">
        <label className="mr-field"><span>{t.next}</span><DateInput value={nextMaintenance} onChange={v => { touch(); setNextMaintenance(v); }} placeholder={t.chooseDate} disabled={pending} /></label>
      </div>
    </section>

    {error && <p className="auth-error" role="alert">{error}</p>}
    <div className="mr-actions">
      {saved && <span className="machine-saved" role="status">{t.saved}</span>}
      <button type="submit" className="folder-add mr-save" disabled={pending}>{pending ? t.saving : t.save}</button>
    </div>
  </form>;
}
