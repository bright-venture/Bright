// The two maintenance-report templates the company uses, transcribed from the Bright Service
// maintenance control forms (one English and one Arabic form per machine model). Each machine's `model` selects one template.
// Client-safe (no server-only code) so both the form and the actions can import it.

export const MACHINE_MODELS = ["scrubmaster_b75r", "walk_behind_scrubber"] as const;
export type MachineModel = (typeof MACHINE_MODELS)[number];

export const MODEL_LABELS: Record<MachineModel, string> = {
  scrubmaster_b75r: "Hako Scrubmaster B75R",
  walk_behind_scrubber: "Hako Walk-Behind Scrubber Drier",
};
export const MODEL_LABELS_AR: Record<MachineModel, string> = {
  scrubmaster_b75r: "Hako Scrubmaster B75R",
  walk_behind_scrubber: "Hako - آلة غسيل وتجفيف أرضيات يدوية",
};
// Report titles as printed at the top of the English and Arabic forms.
export const REPORT_TITLES: Record<MachineModel, { en: string; ar: string }> = {
  scrubmaster_b75r: { en: "BRIGHT SERVICE - HAKO SCRUBMASTER B75R MAINTENANCE REPORT", ar: "BRIGHT SERVICE - تقرير صيانة HAKO SCRUBMASTER B75R" },
  walk_behind_scrubber: { en: "BRIGHT SERVICE - WALK-BEHIND SCRUBBER DRIER MAINTENANCE REPORT", ar: "BRIGHT SERVICE - تقرير صيانة آلة غسيل وتجفيف الأرضيات اليدوية" },
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
  operational: "Operational", needs_maintenance: "Needs Maintenance", waiting_parts: "Waiting Parts", out_of_service: "Out of Service",
};
export const REPORT_STATUS_LABELS_AR: Record<ReportStatus, string> = {
  operational: "تعمل", needs_maintenance: "تحتاج صيانة", waiting_parts: "بانتظار قطع", out_of_service: "خارج الخدمة",
};

// A single checklist row. `state` is one of these (or unset) plus an optional note.
export const CHECK_STATES = ["repaired", "changed"] as const;
export type CheckState = (typeof CHECK_STATES)[number];
export const CHECK_STATE_LABELS: Record<CheckState, string> = { repaired: "Repaired", changed: "Changed" };
export const CHECK_STATE_LABELS_AR: Record<CheckState, string> = { repaired: "تم الإصلاح", changed: "تم التغيير" };

// `label` is the English wording, `ar` the Arabic wording from the form.
export type ChecklistItem = { key: string; label: string; ar: string };
export type FunctionTest = { key: string; label: string; ar: string };
// `columns` are the mark columns this form uses. There is no OK column: a part left blank is fine.
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
      ["Electrical: Fuses / wiring / connectors / control panel / display / switches", "الكهرباء: الفيوزات / الأسلاك / الوصلات / لوحة التحكم / الشاشة / المفاتيح"],
      ["Brush: Left brush", "الفرشاة: الفرشاة اليسرى"],
      ["Brush: Right brush", "الفرشاة: الفرشاة اليمنى"],
      ["Brush: Pad / pad holder", "الفرشاة: الوسادة / حامل الوسادة"],
      ["Brush: Brush head / coupling", "الفرشاة: رأس الفرشاة / الوصلة"],
      ["Brush: Brush motor", "الفرشاة: محرك الفرشاة"],
      ["Brush: Brush-head sealing strip", "الفرشاة: شريط إحكام رأس الفرشاة"],
      ["Brush: Deflecting roller", "الفرشاة: بكرة الحماية"],
      ["Squeegee: Rear sealing blade", "الممسحة: شفرة الإحكام الخلفية"],
      ["Squeegee: Squeegee wheels / rollers", "الممسحة: عجلات / بكرات الممسحة"],
      ["Squeegee: Cleaning squeegee", "الممسحة: تنظيف الممسحة"],
      ["Vacuum: Suction hose", "الشفط: خرطوم الشفط"],
      ["Vacuum: Suction filter", "الشفط: فلتر الشفط"],
      ["Vacuum: Vacuum motor / connections", "الشفط: محرك الشفط / الوصلات"],
      ["Fresh water: Fresh-water tank / cap / gasket", "المياه النظيفة: الخزان / الغطاء / الحشية"],
      ["Fresh water: Water hoses / valve / flow control", "المياه النظيفة: الخراطيم / الصمام / التحكم بالتدفق"],
      ["Waste water: Recovery tank / lid / gasket", "مياه الصرف: خزان الاسترجاع / الغطاء / الحشية"],
      ["Waste water: Drain hose / cap / gasket", "مياه الصرف: خرطوم التصريف / الغطاء / الحشية"],
      ["Machine: Cleanliness of the machine", "الآلة: نظافة الآلة"],
      ["Drive: Drive motor / traction", "الحركة: محرك الدفع / نظام الجر"],
      ["Drive: Drive wheels / castors / bearings", "الحركة: عجلات الدفع / العجلات الدوّارة / الرولمانات"],
      ["Drive: Steering / brake / parking brake", "الحركة: التوجيه / الفرامل / فرامل التوقف"],
      ["Controls: Accelerator pedal", "التحكم: دواسة الحركة"],
      ["Safety: Seat / seat safety switch", "السلامة: المقعد / مفتاح أمان المقعد"],
      ["Body: Frame / protective covers / fasteners", "الهيكل: الإطار / الأغطية الواقية / المثبتات"],
    ]),
    functionTests: tests([
      ["Power ON", "تشغيل الجهاز"], ["Charges", "الشحن"], ["Forward / reverse", "أمامي / خلفي"], ["Brakes", "الفرامل"],
      ["Brushes", "الفرش"], ["Brush head lift", "رفع رأس الفرشاة"], ["Water flow", "تدفق المياه"], ["Vacuum", "الشفط"],
      ["Squeegee", "الممسحة"], ["No leaks", "لا يوجد تسرب"], ["No warnings", "لا توجد تحذيرات"], ["Safe to operate", "آمنة للتشغيل"],
    ]),
  },
  walk_behind_scrubber: {
    model: "walk_behind_scrubber",
    columns: ["repaired", "changed"],
    checklist: checklist([
      ["Brush: Scrubbing brush / pad", "الفرشاة: فرشاة الغسيل / الوسادة"],
      ["Brush: Pad / brush holder", "الفرشاة: الوسادة / حامل الفرشاة"],
      ["Brush: Brush motor & head", "الفرشاة: المحرك ورأس الفرشاة"],
      ["Brush: Brush skirt / splash guard", "الفرشاة: الحاجز المطاطي / مانع تناثر المياه"],
      ["Squeegee: Rear blade", "الممسحة: الشفرة الخلفية"],
      ["Squeegee: Squeegee wheels / rollers", "الممسحة: العجلات / البكرات"],
      ["Vacuum: Suction hose", "الشفط: خرطوم الشفط"],
      ["Vacuum: Vacuum motor / suction filter", "الشفط: محرك الشفط / فلتر الشفط"],
      ["Water: Fresh-water filter", "المياه: فلتر المياه النظيفة"],
      ["Water: Fresh-water tank / cap / seals", "المياه: خزان المياه النظيفة / الغطاء / الحشيات"],
      ["Water: Recovery tank / lid / gasket", "المياه: خزان الاسترجاع / الغطاء / الحشية"],
      ["Water: Drain hose / cap / gasket", "المياه: خرطوم التصريف / الغطاء / الحشية"],
      ["Water: Water hoses / valve / pump", "المياه: الخراطيم / الصمام / المضخة"],
      ["Water: Detergent system", "المياه: نظام المنظف"],
      ["Battery", "البطارية"],
      ["Charger", "الشاحن"],
      ["Electrical: Fuses / wiring / connectors", "الكهرباء: الفيوزات / الأسلاك / الوصلات"],
      ["Electrical: Control panel / switches", "الكهرباء: لوحة التحكم / المفاتيح"],
      ["Safety: Emergency stop / safety controls", "السلامة: زر التوقف الطارئ / أدوات السلامة"],
      ["Drive: Drive motor / traction", "الحركة: محرك الدفع / نظام الجر"],
      ["Drive: Main wheels / castors", "الحركة: العجلات الرئيسية / العجلات الدوّارة"],
      ["Drive: Wheel bearings", "الحركة: رولمانات العجلات"],
      ["Body: Frame / covers / fasteners", "الهيكل: الإطار / الأغطية / المثبتات"],
    ]),
    functionTests: tests([
      ["Power ON", "تشغيل الجهاز"], ["Brushes rotate", "دوران الفرش"], ["Water flow", "تدفق المياه"], ["Vacuum works", "الشفط يعمل"],
      ["Squeegee works", "الممسحة تعمل"], ["Moves correctly", "الحركة سليمة"], ["No leaks", "لا يوجد تسرب"], ["No abnormal noise", "لا يوجد صوت غير طبيعي"],
      ["Safe to operate", "آمنة للتشغيل"],
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
