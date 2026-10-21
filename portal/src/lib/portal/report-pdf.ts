import type { jsPDF as JsPdf } from "jspdf";
import {
  TEMPLATES, MODEL_LABELS, MODEL_LABELS_AR, REPORT_TITLES, MAINTENANCE_TYPES, MAINTENANCE_TYPE_LABELS, MAINTENANCE_TYPE_LABELS_AR,
  REPORT_STATUSES, REPORT_STATUS_LABELS, REPORT_STATUS_LABELS_AR, CHECK_STATE_LABELS, CHECK_STATE_LABELS_AR, type MachineModel,
} from "./maintenance-templates";

type PdfData = {
  reportDate: string | null;
  maintenanceType: string | null;
  operatingHours: string | null;
  siteLocation: string | null;
  machineStatus: string | null;
  problemFound: string | null;
  workPerformed: string | null;
  partsReplaced: string | null;
  partsRequired: string | null;
  nextMaintenance: string | null;
  technicianName: string | null;
  checklist: Record<string, { state?: string; note?: string }>;
  functionTest: Record<string, boolean>;
} | null;

type PdfMachine = { name: string; model: MachineModel | null; assetTag: string | null; location: string | null };
type Option = { ar: string; en: string; on: boolean };
type Cell = { x: number; y: number; width: number; height: number };

const HEAD_FILL: [number, number, number] = [238, 241, 245];
const FONT = "NotoNaskhArabic";
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const STRONG = /[A-Za-zÀ-ɏ؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

// Noto Naskh Arabic (SIL Open Font License) covers Arabic and Latin, so the whole
// form uses one font. Fetched once per page load, only when a PDF is downloaded.
let fonts: Promise<[string, string]> | null = null;
function loadFonts() {
  fonts ??= Promise.all(["Regular", "Bold"].map(async weight => {
    const res = await fetch(`/fonts/NotoNaskhArabic-${weight}.ttf`);
    if (!res.ok) throw new Error("Could not load the report font.");
    const bytes = new Uint8Array(await res.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  })) as Promise<[string, string]>;
  fonts.catch(() => { fonts = null; });
  return fonts;
}

// jsPDF shapes Arabic itself but treats text as visual order by default, which
// scrambles lines mixing Arabic with Latin or numbers. Each line containing Arabic
// is run through its bidi engine in logical order, in the direction of the line's
// first strong character (so "البطارية 12V" and "Changed بطارية" both read right).
function enableBidi(doc: JsPdf) {
  const raw = doc.text.bind(doc) as (text: string | string[], x: number, y: number, options?: object) => JsPdf;
  const patched = (text: string | string[], x: number, y: number, options?: object) => {
    const lines = Array.isArray(text) ? text : [text];
    if (!lines.some(line => ARABIC.test(line))) return raw(text, x, y, options);
    const lineHeight = doc.getFontSize() * doc.getLineHeightFactor() / doc.internal.scaleFactor;
    lines.forEach((line, i) => {
      const first = line.match(STRONG)?.[0] ?? "";
      const bidi = ARABIC.test(line) ? { isInputVisual: false, isOutputVisual: true, isInputRtl: ARABIC.test(first), isOutputRtl: false, isSymmetricSwapping: true } : {};
      raw(line, x, y + i * lineHeight, { ...options, ...bidi });
    });
    return doc;
  };
  (doc as unknown as { text: typeof patched }).text = patched;
}

const isRtl = (text: string) => ARABIC.test(text.match(STRONG)?.[0] ?? "");
const both = (ar: string, en: string) => (ar === en ? en : `${ar}\n${en}`);

// Builds a real, downloadable PDF laid out like the bilingual Bright Service paper
// form (right to left, Arabic with English). jsPDF/autotable and the font load on
// demand so they never weigh down the main bundle.
export async function downloadReportPdf(machine: PdfMachine, data: PdfData) {
  if (!machine.model) return;
  const model = machine.model;
  const template = TEMPLATES[model];
  const d = data ?? { reportDate: null, maintenanceType: null, operatingHours: null, siteLocation: null, machineStatus: null, problemFound: null, workPerformed: null, partsReplaced: null, partsRequired: null, nextMaintenance: null, technicianName: null, checklist: {}, functionTest: {} };

  const [{ jsPDF }, { default: autoTable }, [regular, bold]] = await Promise.all([import("jspdf"), import("jspdf-autotable"), loadFonts()]);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.addFileToVFS("NotoNaskhArabic-Regular.ttf", regular);
  doc.addFont("NotoNaskhArabic-Regular.ttf", FONT, "normal");
  doc.addFileToVFS("NotoNaskhArabic-Bold.ttf", bold);
  doc.addFont("NotoNaskhArabic-Bold.ttf", FONT, "bold");
  enableBidi(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;
  const right = pageW - margin;
  const finalY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const base = { font: FONT, textColor: 17, lineColor: [17, 17, 17] as [number, number, number], lineWidth: 0.5, valign: "middle" as const };
  const label = (ar: string, en: string) => ({ content: both(ar, en), styles: { fontStyle: "bold" as const, fillColor: HEAD_FILL, halign: "center" as const } });
  // Arabic text is right-aligned with a little extra room: shaped glyphs can run wider than measured.
  const value = (text: string | null) => text && isRtl(text)
    ? { content: text, styles: { halign: "right" as const, cellPadding: { top: 4, bottom: 4, left: 5, right: 8 } } }
    : { content: text ?? "", styles: { halign: "left" as const } };

  // A row of tick boxes, laid out right to left: [box] Arabic, English underneath.
  function drawOptions(cell: Cell, options: Option[]) {
    const slot = (cell.width - 8) / options.length;
    const mid = cell.y + cell.height / 2;
    options.forEach((o, i) => {
      const box = 9;
      const bx = cell.x + cell.width - 8 - i * slot - box;
      doc.setLineWidth(0.7);
      doc.rect(bx, mid - box / 2, box, box);
      if (o.on) {
        doc.setLineWidth(1.1);
        doc.line(bx + 2, mid - box / 2 + 2, bx + box - 2, mid + box / 2 - 2);
        doc.line(bx + 2, mid + box / 2 - 2, bx + box - 2, mid - box / 2 + 2);
      }
      doc.setFont(FONT, o.on ? "bold" : "normal");
      doc.setFontSize(9);
      doc.text(o.ar, bx - 5, mid - 1, { align: "right" });
      doc.setFont(FONT, "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(95);
      doc.text(o.en, bx - 5, mid + 8.5, { align: "right" });
      doc.setTextColor(17);
    });
  }

  // Section title: Arabic on the right, English on the left, on one line.
  function heading(ar: string, en: string, at: number) {
    doc.setFont(FONT, "bold");
    doc.setFontSize(11.5);
    doc.text(ar, right, at, { align: "right" });
    doc.setFontSize(10);
    doc.text(en, margin, at);
  }

  let y = 44;
  doc.setTextColor(17);
  doc.setFont(FONT, "bold");
  doc.setFontSize(15);
  doc.text("BRIGHT SERVICE", pageW / 2, y, { align: "center" });
  y += 20;
  doc.setFontSize(13);
  doc.text(REPORT_TITLES[model].ar, pageW / 2, y, { align: "center" });
  y += 16;
  doc.setFont(FONT, "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(REPORT_TITLES[model].en, pageW / 2, y, { align: "center" });
  doc.setTextColor(17);
  y += 10;

  // Header (pairs read right to left, so each row lists its columns reversed).
  const typeOptions = MAINTENANCE_TYPES.map(t => ({ ar: MAINTENANCE_TYPE_LABELS_AR[t], en: MAINTENANCE_TYPE_LABELS[t], on: d.maintenanceType === t }));
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { ...base, fontSize: 9, cellPadding: 4 },
    body: [
      [value(machine.assetTag), label("رقم الماكينة", "Machine ID"), value(both(MODEL_LABELS_AR[model], MODEL_LABELS[model])), label("الماكينة / الموديل", "Machine / Model")],
      [value(d.technicianName), label("التقني", "Technician"), value(d.reportDate), label("التاريخ", "Date")],
      [{ content: "", colSpan: 3, styles: { minCellHeight: 28 } }, label("نوع الصيانة", "Maintenance type")],
      [value(d.siteLocation), label("الموقع", "Site / Location"), value(d.operatingHours), label("ساعات التشغيل", "Operating hours")],
    ],
    columnStyles: { 1: { cellWidth: 92 }, 3: { cellWidth: 92 } },
    margin: { left: margin, right: margin },
    didDrawCell: h => { if (h.section === "body" && h.row.index === 2 && h.column.index === 0) drawOptions(h.cell, typeOptions); },
  });
  y = finalY() + 22;

  // Checklist: Part on the right, then the mark columns, Notes on the left.
  heading("قائمة فحص الصيانة", "Maintenance Checklist", y);
  const cols = [...template.columns].reverse();
  const head = [["ملاحظات\nNotes", ...cols.map(c => `${CHECK_STATE_LABELS_AR[c]}\n${CHECK_STATE_LABELS[c]}`), "القطعة\nComponent / Part"]];
  const body = template.checklist.map(item => {
    const e = d.checklist[item.key] ?? {};
    return [value(e.note ?? null), ...cols.map(c => ({ content: e.state === c ? "X" : "", styles: { fontStyle: "bold" as const } })), both(item.ar, item.label)];
  });
  const partCol = cols.length + 1;
  const columnStyles: Record<number, { cellWidth?: number; halign?: "center" | "right" }> = { [partCol]: { cellWidth: cols.length === 2 ? 240 : 214, halign: "right" } };
  cols.forEach((_, i) => { columnStyles[i + 1] = { cellWidth: 60, halign: "center" }; });
  autoTable(doc, {
    startY: y + 8,
    theme: "grid",
    head,
    body,
    styles: { ...base, fontSize: 8.5, cellPadding: { top: 3, bottom: 3, left: 5, right: 5 } },
    headStyles: { fillColor: HEAD_FILL, fontStyle: "bold", halign: "center" },
    columnStyles,
    rowPageBreak: "avoid",
    margin: { left: margin, right: margin },
  });
  y = finalY() + 22;

  // Final function test: a grid of tick boxes, three per row.
  if (y > pageH - 140) { doc.addPage(); y = 48; }
  heading("اختبار التشغيل النهائي", "Final Function Test", y);
  const tests = template.functionTests.map(t => ({ ar: t.ar, en: t.label, on: !!d.functionTest[t.key] }));
  const testRows: Option[][] = [];
  for (let i = 0; i < tests.length; i += 3) testRows.push(tests.slice(i, i + 3));
  autoTable(doc, {
    startY: y + 8,
    theme: "grid",
    styles: { ...base, fontSize: 9, minCellHeight: 28 },
    body: testRows.map(() => ["", "", ""]),
    margin: { left: margin, right: margin },
    didDrawCell: h => {
      if (h.section !== "body") return;
      const option = testRows[h.row.index]?.[2 - h.column.index];
      if (option) drawOptions(h.cell, [option]);
    },
  });
  y = finalY() + 16;

  // Findings and outcome.
  const statusOptions = REPORT_STATUSES.map(s => ({ ar: REPORT_STATUS_LABELS_AR[s], en: REPORT_STATUS_LABELS[s], on: d.machineStatus === s }));
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { ...base, fontSize: 9, cellPadding: 5 },
    body: [
      [value(d.problemFound), label("المشكلة / العطل الموجود", "Problem / Fault found")],
      [value(d.workPerformed), label("العمل المنفّذ", "Work performed")],
      [value(d.partsReplaced), label("القطع المستبدلة", "Parts replaced")],
      [value(d.partsRequired), label("القطع المطلوبة", "Parts still required")],
      [{ content: "", styles: { minCellHeight: 30 } }, label("حالة الماكينة", "Machine status")],
      [value(d.nextMaintenance), label("الصيانة القادمة", "Next maintenance")],
    ],
    columnStyles: { 1: { cellWidth: 132 } },
    rowPageBreak: "avoid",
    margin: { left: margin, right: margin },
    didDrawCell: h => { if (h.section === "body" && h.row.index === 4 && h.column.index === 0) drawOptions(h.cell, statusOptions); },
  });

  const safe = `${machine.name} - maintenance report${d.reportDate ? " " + d.reportDate : ""}`.replace(/[\\/:*?"<>|]/g, "-");
  doc.save(`${safe}.pdf`);
}
