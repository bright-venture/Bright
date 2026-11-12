import type { jsPDF as JsPdf } from "jspdf";
import {
  TEMPLATES, MODEL_LABELS, MODEL_LABELS_AR, MAINTENANCE_TYPES, REPORT_STATUSES, type MachineModel,
} from "./maintenance-templates";
import { REPORT_TEXT, type Lang } from "./report-i18n";

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
type RGB = [number, number, number];
// One piece of a line of tick boxes and labels, e.g. "☐ Preventive" or "Operating Hours:".
type FlowItem = { text: string; box?: boolean; on?: boolean; bold?: boolean; after?: number };

// Colours of the Bright Service maintenance control forms.
const NAVY: RGB = [23, 54, 93];
const BLUE: RGB = [47, 117, 181];
const LABEL_FILL: RGB = [217, 234, 247];
const LIGHT_FILL: RGB = [238, 245, 251];
const GRID: RGB = [126, 166, 201];
const LIGHT_LINE: RGB = [157, 195, 230];
const INK: RGB = [31, 31, 31];
const TEAL: RGB = [22, 140, 140];
const BLANK = "________________";

const FONT = "NotoNaskhArabic";
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const STRONG = /[A-Za-zÀ-ɏ؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

// Noto Naskh Arabic (SIL Open Font License) covers Arabic and Latin; it sets the Arabic form
// and any Arabic a technician types into the English one. Fetched once per page load.
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
// is run through its bidi engine in logical order: right to left on the Arabic form,
// otherwise in the direction of the line's first strong character.
function enableBidi(doc: JsPdf, rtl: boolean) {
  const raw = doc.text.bind(doc) as (text: string | string[], x: number, y: number, options?: object) => JsPdf;
  const patched = (text: string | string[], x: number, y: number, options?: object) => {
    const lines = Array.isArray(text) ? text : [text];
    if (!lines.some(line => ARABIC.test(line))) return raw(text, x, y, options);
    const lineHeight = doc.getFontSize() * doc.getLineHeightFactor() / doc.internal.scaleFactor;
    lines.forEach((line, i) => {
      const first = line.match(STRONG)?.[0] ?? "";
      const bidi = ARABIC.test(line) ? { isInputVisual: false, isOutputVisual: true, isInputRtl: rtl || ARABIC.test(first), isOutputRtl: false, isSymmetricSwapping: true } : {};
      raw(line, x, y + i * lineHeight, { ...options, ...bidi });
    });
    return doc;
  };
  (doc as unknown as { text: typeof patched }).text = patched;
}

// Builds a real, downloadable PDF laid out like the Bright Service maintenance control
// form, in English or Arabic (right to left) like the two paper versions. jsPDF/autotable
// and the font load on demand so they never weigh down the main bundle.
export async function downloadReportPdf(machine: PdfMachine, data: PdfData, lang: Lang = "ar") {
  if (!machine.model) return;
  const model = machine.model;
  const template = TEMPLATES[model];
  const t = REPORT_TEXT[lang];
  const rtl = lang === "ar";
  const d = data ?? { reportDate: null, maintenanceType: null, operatingHours: null, siteLocation: null, machineStatus: null, problemFound: null, workPerformed: null, partsReplaced: null, partsRequired: null, nextMaintenance: null, technicianName: null, checklist: {}, functionTest: {} };

  const [{ jsPDF }, { default: autoTable }, [regular, bold]] = await Promise.all([import("jspdf"), import("jspdf-autotable"), loadFonts()]);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.addFileToVFS("NotoNaskhArabic-Regular.ttf", regular);
  doc.addFont("NotoNaskhArabic-Regular.ttf", FONT, "normal");
  doc.addFileToVFS("NotoNaskhArabic-Bold.ttf", bold);
  doc.addFont("NotoNaskhArabic-Bold.ttf", FONT, "bold");
  enableBidi(doc, rtl);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;
  const right = pageW - margin;
  const width = right - margin;
  const bottom = pageH - 48;
  const finalY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // Latin text is set in a sans serif like the forms' Arial; anything with Arabic needs the Arabic font.
  const fontFor = (text: string) => (ARABIC.test(text) ? FONT : "helvetica");
  // Columns are listed in reading order; on the Arabic form the first one sits on the right.
  const inOrder = <T,>(cells: T[]) => (rtl ? [...cells].reverse() : cells);
  const widths = (cols: number[]) => Object.fromEntries(inOrder(cols).map((w, i) => [i, { cellWidth: w }]));
  const halign = (text: string) => (rtl || ARABIC.test(text.match(STRONG)?.[0] ?? "") ? "right" as const : "left" as const);

  function write(text: string, x: number, y: number, o: { size: number; bold?: boolean; color?: RGB; align?: "left" | "right" | "center" }) {
    doc.setFont(fontFor(text), o.bold ? "bold" : "normal");
    doc.setFontSize(o.size);
    doc.setTextColor(...(o.color ?? INK));
    doc.text(text, x, y, { align: o.align ?? "left" });
  }
  function measure(text: string, size: number, bold = false) {
    doc.setFont(fontFor(text), bold ? "bold" : "normal");
    doc.setFontSize(size);
    // Shaped Arabic can run a little wider than jsPDF measures it.
    return doc.getTextWidth(text) * (ARABIC.test(text) ? 1.08 : 1);
  }
  function tickBox(x: number, y: number, size: number, on: boolean) {
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.6);
    doc.rect(x, y, size, size);
    if (!on) return;
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(1.1);
    doc.line(x + 1.5, y + 1.5, x + size - 1.5, y + size - 1.5);
    doc.line(x + 1.5, y + size - 1.5, x + size - 1.5, y + 1.5);
  }

  // Lays tick boxes and labels out on lines like the form ("☐ Preventive ☐ Repair ..."),
  // wrapping inside `w`, left to right or right to left. Returns the height used.
  function flow(items: FlowItem[], x: number, top: number, w: number, size: number, draw: boolean) {
    const box = size * 0.8;
    const lineH = size * 1.55;
    const lines: { item: FlowItem; w: number }[][] = [[]];
    let used = 0;
    for (const item of items) {
      const iw = (item.box ? box + 3 : 0) + measure(item.text, size, item.bold || item.on);
      if (used > 0 && used + iw > w) { lines.push([]); used = 0; }
      lines[lines.length - 1].push({ item, w: iw });
      used += iw + (item.after ?? 4);
    }
    if (draw) lines.forEach((line, i) => {
      const base = top + i * lineH + size;
      let cursor = rtl ? x + w : x;
      for (const { item, w: iw } of line) {
        const textW = iw - (item.box ? box + 3 : 0);
        if (item.box) {
          tickBox(rtl ? cursor - box : cursor, base - box + 0.5, box, !!item.on);
          cursor += rtl ? -(box + 3) : box + 3;
        }
        write(item.text, cursor, base, { size, bold: item.bold || item.on, color: INK, align: rtl ? "right" : "left" });
        cursor += rtl ? -(textW + (item.after ?? 4)) : textW + (item.after ?? 4);
      }
    });
    return lines.length * lineH;
  }

  // Blue section bar with a white title, e.g. "Maintenance Checklist".
  let y = 34;
  function sectionBar(title: string, keepWith: number) {
    if (y + 16 + keepWith > bottom) { doc.addPage(); y = 40; }
    doc.setFillColor(...BLUE);
    doc.rect(margin, y, width, 15, "F");
    write(title, rtl ? right - 4 : margin + 4, y + 11, { size: 10, bold: true, color: [255, 255, 255], align: rtl ? "right" : "left" });
    y += 18;
  }

  const base = { font: rtl ? FONT : "helvetica", textColor: INK, lineColor: GRID, lineWidth: 0.6, valign: "middle" as const };
  const label = (text: string) => ({ content: text, styles: { font: fontFor(text), fontStyle: "bold" as const, fillColor: LABEL_FILL, textColor: NAVY, halign: "center" as const } });
  const value = (text: string | null, blank = BLANK) => {
    const v = text?.trim() ? text : blank;
    return { content: v, styles: { font: fontFor(v), halign: halign(v), cellPadding: { top: 5, bottom: 5, left: 6, right: ARABIC.test(v) ? 9 : 6 } } };
  };

  // Title bar.
  doc.setFillColor(...LABEL_FILL);
  doc.rect(margin, y, width, 26, "F");
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(1);
  doc.line(margin, y, right, y);
  doc.line(margin, y + 26, right, y + 26);
  write(t.title[model], pageW / 2, y + 17.5, { size: 12.5, bold: true, color: NAVY, align: "center" });
  y += 34;

  // Machine / Model, Machine ID, Date, Technician.
  const headerCols = [92, 170, 92, width - 354];
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { ...base, fontSize: 9.5, minCellHeight: 30, cellPadding: 5 },
    body: [
      inOrder([label(t.machineModel), value(rtl ? MODEL_LABELS_AR[model] : MODEL_LABELS[model]), label(t.machineId), value(machine.assetTag)]),
      inOrder([label(t.date), value(d.reportDate), label(t.technician), value(d.technicianName)]),
    ],
    columnStyles: widths(headerCols),
    margin: { left: margin, right: margin },
  });
  y = finalY() + 6;

  // Maintenance Type, Operating Hours and Site/Location on one shaded line.
  const lineItems: FlowItem[] = [
    { text: `${t.type}:`, after: 5 },
    ...MAINTENANCE_TYPES.map((m, i) => ({ text: t.types[m], box: true, on: d.maintenanceType === m, after: i === MAINTENANCE_TYPES.length - 1 ? 14 : 6 })),
    { text: `${t.hours}:`, after: 4 },
    { text: d.operatingHours?.trim() || "__________", after: 14 },
    { text: `${t.site}:`, after: 4 },
    { text: d.siteLocation?.trim() || "____________________" },
  ];
  const lineH = flow(lineItems, margin + 10, 0, width - 20, 8.5, false);
  doc.setFillColor(...LIGHT_FILL);
  doc.setDrawColor(...LIGHT_LINE);
  doc.setLineWidth(0.6);
  doc.rect(margin + 6, y, width - 12, lineH + 6, "FD");
  flow(lineItems, margin + 10, y + 2, width - 20, 8.5, true);
  y += lineH + 16;

  // Maintenance Checklist: Component / Part, the mark columns, Notes.
  sectionBar(t.checklist, 80);
  const marks = template.columns;
  const checklistCols = [246, ...marks.map(() => 62), width - 246 - marks.length * 62];
  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [inOrder([t.part, ...marks.map(m => t.states[m]), t.notes])],
    body: template.checklist.map(item => {
      const e = d.checklist[item.key] ?? {};
      const part = rtl ? item.ar : item.label;
      return inOrder([
        { content: part, styles: { font: fontFor(part), fontStyle: "bold" as const, textColor: NAVY, halign: halign(part) } },
        ...marks.map(() => ""),
        value(e.note ?? null, ""),
      ]);
    }),
    styles: { ...base, fontSize: 8.5, minCellHeight: 22, cellPadding: { top: 4, bottom: 4, left: 6, right: 6 } },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold", halign: "center" },
    columnStyles: widths(checklistCols),
    rowPageBreak: "avoid",
    margin: { left: margin, right: margin, top: 40, bottom: 48 },
    didDrawCell: h => {
      if (h.section !== "body") return;
      const col = rtl ? checklistCols.length - 1 - h.column.index : h.column.index;
      const mark = marks[col - 1];
      if (!mark) return;
      const size = 7.5;
      tickBox(h.cell.x + (h.cell.width - size) / 2, h.cell.y + (h.cell.height - size) / 2, size, d.checklist[template.checklist[h.row.index].key]?.state === mark);
    },
  });
  y = finalY() + 10;

  // Final Function Test: tick boxes on a shaded band.
  const testItems = template.functionTests.map(test => ({ text: rtl ? test.ar : test.label, box: true, on: !!d.functionTest[test.key], after: 9 }));
  const testH = flow(testItems, margin + 10, 0, width - 20, 8.5, false);
  sectionBar(t.functionTest, testH + 10);
  doc.setFillColor(...LIGHT_FILL);
  doc.setDrawColor(...LIGHT_LINE);
  doc.setLineWidth(0.6);
  doc.rect(margin + 6, y - 2, width - 12, testH + 8, "FD");
  flow(testItems, margin + 10, y + 1, width - 20, 8.5, true);
  y += testH + 16;

  // Findings and outcome, in the form's two-pair grid.
  const statusItems = REPORT_STATUSES.map(s => ({ text: t.statuses[s], box: true, on: d.machineStatus === s, after: 8 }));
  const statusH = flow(statusItems, 0, 0, headerCols[1] - 12, 8.5, false);
  if (y + 2 * 70 + statusH + 20 > bottom) { doc.addPage(); y = 40; }
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { ...base, fontSize: 9, cellPadding: 6 },
    body: [
      inOrder([label(t.problem), value(d.problemFound, ""), label(t.work), value(d.workPerformed, "")]),
      inOrder([label(t.replaced), value(d.partsReplaced, ""), label(t.required), value(d.partsRequired, "")]),
      inOrder([label(t.status), { content: "", styles: { minCellHeight: statusH + 16 } }, label(t.next), value(d.nextMaintenance, "______________")]),
    ],
    columnStyles: widths(headerCols),
    rowPageBreak: "avoid",
    margin: { left: margin, right: margin, top: 40, bottom: 48 },
    didParseCell: h => { if (h.row.index < 2) h.cell.styles.minCellHeight = 70; },
    didDrawCell: h => {
      const col = rtl ? headerCols.length - 1 - h.column.index : h.column.index;
      if (h.section === "body" && h.row.index === 2 && col === 1) flow(statusItems, h.cell.x + 6, h.cell.y + (h.cell.height - statusH) / 2, h.cell.width - 12, 8.5, true);
    },
  });

  // "BRIGHT SERVICE COMPANY | MAINTENANCE CONTROL FORM" at the foot of every page.
  for (let p = 1; p <= doc.getNumberOfPages(); p++) {
    doc.setPage(p);
    write(t.formFooter, pageW / 2, pageH - 24, { size: 7, bold: true, color: TEAL, align: "center" });
  }

  const safe = `${machine.name} - maintenance report${d.reportDate ? " " + d.reportDate : ""}${rtl ? " (AR)" : " (EN)"}`.replace(/[\\/:*?"<>|]/g, "-");
  doc.save(`${safe}.pdf`);
}
