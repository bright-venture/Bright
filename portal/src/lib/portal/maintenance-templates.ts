// The two maintenance-report templates the company uses, transcribed from the
// bilingual (Arabic / English) Bright Service forms. Each machine's `model` selects one template.
// Client-safe (no server-only code) so both the form and the actions can import it.

export const MACHINE_MODELS = ["scrubmaster_b75r", "walk_behind_scrubber"] as const;
export type MachineModel = (typeof MACHINE_MODELS)[number];

export const MODEL_LABELS: Record<MachineModel, string> = {
  scrubmaster_b75r: "Hako Scrubmaster B75R",
  walk_behind_scrubber: "Hako Walk-Behind Scrubber Drier",
};
export const MODEL_LABELS_AR: Record<MachineModel, string> = {
  scrubmaster_b75r: "Hako Scrubmaster B75R",
  walk_behind_scrubber: "Hako - ماكينة غسيل وتجفيف أرضيات",
};
// Report titles as printed on the bilingual Bright Service forms.
export const REPORT_TITLES: Record<MachineModel, { en: string; ar: string }> = {
  scrubmaster_b75r: { en: "Hako Scrubmaster B75R Maintenance Report", ar: "تقرير صيانة HAKO SCRUBMASTER B75R" },
  walk_behind_scrubber: { en: "Walk-Behind Scrubber Drier Maintenance Report", ar: "تقرير صيانة آلة غسيل وتجفيف الأرضيات اليدوية" },
};

export const MAINTENANCE_TYPES = ["preventive", "repair", "breakdown"] as const;
export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];
export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  preventive: "Preventive", repair: "Repair", breakdown: "Breakdown",
};
export const MAINTENANCE_TYPE_LABELS_AR: Record<MaintenanceType, string> = {
  preventive: "وقائية", repair: "إصلاح", breakdown: "عطل",
};

export const REPORT_STATUSES = ["operational", "needs_maintenance", "waiting_parts", "out_of_service"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  operational: "Operational", needs_maintenance: "Needs maintenance", waiting_parts: "Waiting parts", out_of_service: "Out of service",
};
export const REPORT_STATUS_LABELS_AR: Record<ReportStatus, string> = {
  operational: "تعمل", needs_maintenance: "تحتاج صيانة", waiting_parts: "بانتظار قطع", out_of_service: "خارج الخدمة",
};

// A single checklist row. `state` is one of these (or unset) plus an optional note.
export const CHECK_STATES = ["ok", "repaired", "changed"] as const;
export type CheckState = (typeof CHECK_STATES)[number];
export const CHECK_STATE_LABELS: Record<CheckState, string> = { ok: "OK", repaired: "Repaired", changed: "Changed" };
export const CHECK_STATE_LABELS_AR: Record<CheckState, string> = { ok: "سليم", repaired: "تم الإصلاح", changed: "تم التغيير" };

// `label` is the English wording, `ar` the Arabic wording from the form.
export type ChecklistItem = { key: string; label: string; ar: string };
export type FunctionTest = { key: string; label: string; ar: string };
// `columns` are the mark columns this form uses (B75R has no OK column).
export type Template = { model: MachineModel; columns: readonly CheckState[]; checklist: ChecklistItem[]; functionTests: FunctionTest[] };

// Keys are stable position-based ids (c1, f1…). Reports snapshot the model, and the
// templates never renumber, so stored reports always resolve their labels.
function checklist(labels: [string, string][]): ChecklistItem[] {
  return labels.map(([label, ar], i) => ({ key: `c${i + 1}`, label, ar }));
}
function tests(labels: [string, string][]): FunctionTest[] {
  return labels.map(([label, ar], i) => ({ key: `f${i + 1}`, label, ar }));
}

export const TEMPLATES: Record<MachineModel, Template> = {
  scrubmaster_b75r: {
    model: "scrubmaster_b75r",
    columns: ["repaired", "changed"],
    checklist: checklist([
      ["Battery", "البطارية"],
      ["Charger", "الشاحن"],
      ["Electrical: Fuses / Wiring / Connectors / Control panel / Display / Switches", "كهرباء: فيوزات / وايرات / فيش / لوحة التحكم / شاشة / كبسات"],
      ["Left brush", "الفرشاية الشمال"],
      ["Right brush", "الفرشاية اليمين"],
      ["Pad / Pad holder", "الباد / حاملة الباد"],
      ["Brush head / Coupling", "راس الفرشاية / الوصلة"],
      ["Brush motor", "موتور الفرشاية"],
      ["Brush-head seal", "جلدة راس الفرشاية"],
      ["Deflecting roller", "رول الحماية"],
      ["Rear squeegee blade", "شفرة السكويجي الخلفية"],
      ["Squeegee wheels / Rollers", "دواليب / رولات السكويجي"],
      ["Squeegee cleaning", "تنظيف السكويجي"],
      ["Suction hose", "هوز الشفط"],
      ["Suction filter", "فلتر الشفط"],
      ["Vacuum motor / Connections", "موتور الشفط / الوصلات"],
      ["Fresh-water tank / Cap / Gasket", "تانك المي النظيفة / الغطا / الجلدة"],
      ["Water hoses / Valve / Flow control", "هوزات المي / الفالف / تحكم المي"],
      ["Recovery tank / Lid / Gasket", "تانك المي الوسخة / الغطا / الجلدة"],
      ["Drain hose / Cap / Gasket", "هوز التصريف / الغطا / الجلدة"],
      ["Machine cleanliness", "نضافة الماكينة"],
      ["Drive motor / Traction", "موتور الحركة / سيستم الجر"],
      ["Drive wheels / Castors / Bearings", "دواليب الحركة / كاستر / رولمان"],
      ["Steering / Brake / Parking brake", "ستيرينغ / بريك / هاند بريك"],
      ["Accelerator pedal", "دعسة الحركة"],
      ["Seat / Seat safety switch", "الكرسي / سويتش أمان الكرسي"],
      ["Frame / Covers / Fasteners", "الشاسيه / الغطايات / البراغي"],
    ]),
    functionTests: tests([
      ["Power ON", "تشغيل الجهاز"], ["Charges", "الشحن"], ["Forward / Reverse", "أمامي / خلفي"], ["Brakes", "الفرامل"],
      ["Brushes", "الفرش"], ["Brush head lift", "رفع رأس الفرشاة"], ["Water flow", "تدفق المياه"], ["Vacuum", "الشفط"],
      ["Squeegee", "الممسحة"], ["No leaks", "لا يوجد تسرب"], ["No warnings", "لا توجد تحذيرات"], ["Safe to operate", "آمنة للتشغيل"],
    ]),
  },
  walk_behind_scrubber: {
    model: "walk_behind_scrubber",
    columns: ["ok", "repaired", "changed"],
    checklist: checklist([
      ["Scrubbing brush / Pad", "فرشاية الغسيل / الباد"],
      ["Pad / Brush holder", "الباد / حاملة الفرشاية"],
      ["Brush motor / Head", "موتور الفرشاية / راس الفرشاية"],
      ["Brush skirt / Splash guard", "جلدة الفرشاية / مانع رش المي"],
      ["Rear squeegee blade", "شفرة السكويجي الخلفية"],
      ["Squeegee wheels / Rollers", "دواليب / رولات السكويجي"],
      ["Suction hose", "هوز الشفط"],
      ["Vacuum motor / Suction filter", "موتور الشفط / فلتر الشفط"],
      ["Fresh-water filter", "فلتر المي النظيفة"],
      ["Fresh-water tank / Cap / Seals", "تانك المي النظيفة / الغطا / الجلدة"],
      ["Recovery tank / Lid / Gasket", "تانك المي الوسخة / الغطا / الجلدة"],
      ["Drain hose / Cap / Gasket", "هوز التصريف / الغطا / الجلدة"],
      ["Water hoses / Valve / Pump", "هوزات المي / فالف / بومب"],
      ["Detergent system", "سيستم الصابون"],
      ["Battery", "البطارية"],
      ["Charger", "الشاحن"],
      ["Electrical: Fuses / Wiring / Connectors", "كهرباء: فيوزات / وايرات / فيش"],
      ["Control panel / Switches", "لوحة التحكم / الكبسات"],
      ["Emergency stop / Safety controls", "زر الإيمرجنسي / سيفتي"],
      ["Drive motor / Traction", "موتور الحركة / سيستم الجر"],
      ["Main wheels / Castors", "الدواليب الرئيسية / كاستر"],
      ["Wheel bearings", "رولمان الدواليب"],
      ["Frame / Covers / Fasteners", "الشاسيه / الغطايات / البراغي"],
    ]),
    functionTests: tests([
      ["Power ON", "تشغيل الجهاز"], ["Brushes rotate", "دوران الفرش"], ["Water flow", "تدفق المياه"], ["Vacuum works", "الشفط يعمل"],
      ["Squeegee works", "الممسحة تعمل"], ["Moves correctly", "الحركة سليمة"], ["No leaks", "لا يوجد تسرب"],
      ["No abnormal noise", "لا يوجد صوت غير طبيعي"], ["Safe to operate", "آمنة للتشغيل"],
    ]),
  },
};

// Shape of a stored report (camelCase). checklist maps item key -> entry.
// A row may carry a state, a note, or both (the paper's Notes column can be used alone).
export type ChecklistEntry = { state?: CheckState; note?: string };
export type MaintenanceReport = {
  id: string;
  machineId: string;
  model: MachineModel;
  reportDate: string;
  maintenanceType: MaintenanceType | null;
  operatingHours: string | null;
  siteLocation: string | null;
  machineStatus: ReportStatus | null;
  problemFound: string | null;
  workPerformed: string | null;
  partsReplaced: string | null;
  partsRequired: string | null;
  nextMaintenance: string | null;
  technicianName: string | null;
  checklist: Record<string, ChecklistEntry>;
  functionTest: Record<string, boolean>;
  createdAt: string;
  updatedAt: string | null;
};

// An archived, immutable snapshot of a report at one save.
export type ReportSnapshot = {
  id: string;
  machineId: string;
  model: MachineModel;
  reportDate: string | null;
  maintenanceType: MaintenanceType | null;
  operatingHours: string | null;
  siteLocation: string | null;
  machineStatus: ReportStatus | null;
  problemFound: string | null;
  workPerformed: string | null;
  partsReplaced: string | null;
  partsRequired: string | null;
  nextMaintenance: string | null;
  technicianName: string | null;
  checklist: Record<string, ChecklistEntry>;
  functionTest: Record<string, boolean>;
  savedAt: string;
};

export type ReportInput = {
  machineId: string;
  reportDate: string;
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
  // True when this save starts a new report: the current one is archived first
  // if it has content that isn't already in Saved versions.
  archivePrevious?: boolean;
};

export type ReportResult = { ok: boolean; error?: string };
