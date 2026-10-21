import {
  MODEL_LABELS, MODEL_LABELS_AR, MAINTENANCE_TYPE_LABELS, MAINTENANCE_TYPE_LABELS_AR,
  REPORT_STATUS_LABELS, REPORT_STATUS_LABELS_AR, CHECK_STATE_LABELS, CHECK_STATE_LABELS_AR,
} from "./maintenance-templates";
import { STATUS_LABELS, type MachineStatus } from "./machine-types";

// Wording for the technician-facing report page, in English and Arabic.
// The page defaults to Arabic (the forms technicians know) and remembers the choice.
export type Lang = "en" | "ar";
export const LANG_KEY = "report-lang";

const MACHINE_STATUS_AR: Record<MachineStatus, string> = { running: "تعمل", idle: "متوقفة", maintenance: "صيانة", down: "معطلة" };

export const REPORT_TEXT = {
  en: {
    eyebrow: "MACHINE REPORT", back: "Back", noModel: "No model set", id: "ID",
    newReport: "New report", newReportHint: "The current one stays in Saved versions.",
    lastEdited: "Last edited", notSaved: "Not saved yet.",
    noTemplate: "This machine has no report template yet. Ask an administrator to set its model in the portal.",
    savedVersions: "Saved versions", noVersions: "No saved versions yet. Each time the report is saved, a copy is archived here.",
    confirmDeleteReport: "Are you sure you want to delete this machine's report? It will be reset to blank. This cannot be undone.",
    confirmDeleteVersion: "Are you sure you want to delete this saved version? This cannot be undone.",
    deleteReport: "Delete report", deleteVersion: "Delete version",
    details: "Details", technician: "Technician", date: "Date", hours: "Operating hours", hoursHint: "e.g. 1240",
    site: "Site / location", type: "Maintenance type", chooseDate: "Choose a date",
    checklist: "Maintenance checklist", markHint: (cols: string[]) => `Mark ${cols.join(" / ")} for each part that applies.`,
    blankHint: "Leave a part blank if it is fine.", note: "Note", addNote: "Add a note", noteFor: (l: string) => `Add a note for ${l}`,
    functionTest: "Final function test", findings: "Findings",
    problem: "Problem / fault found", work: "Work performed", replaced: "Parts replaced", required: "Parts still required",
    outcome: "Outcome", status: "Machine status", next: "Next maintenance",
    saved: "Saved.", saving: "Saving…", save: "Save report", saveError: "Could not save the report.",
    vChecklist: "Checklist", vTests: "Function test", vHours: "Hours", vSite: "Site", vNext: "Next",
    model: MODEL_LABELS, types: MAINTENANCE_TYPE_LABELS, statuses: REPORT_STATUS_LABELS, states: CHECK_STATE_LABELS,
    machineStatus: STATUS_LABELS,
  },
  ar: {
    eyebrow: "تقرير الماكينة", back: "رجوع", noModel: "لا يوجد موديل", id: "رقم",
    newReport: "تقرير جديد", newReportHint: "التقرير الحالي يبقى في النسخ المحفوظة.",
    lastEdited: "آخر تعديل", notSaved: "لم يُحفظ بعد.",
    noTemplate: "لا يوجد نموذج تقرير لهذه الماكينة بعد. اطلب من المسؤول تحديد الموديل في البوابة.",
    savedVersions: "النسخ المحفوظة", noVersions: "لا توجد نسخ محفوظة بعد. عند كل حفظ تُؤرشف نسخة من التقرير هنا.",
    confirmDeleteReport: "هل أنت متأكد من حذف تقرير هذه الماكينة؟ سيعود فارغاً ولا يمكن التراجع.",
    confirmDeleteVersion: "هل أنت متأكد من حذف هذه النسخة المحفوظة؟ لا يمكن التراجع.",
    deleteReport: "حذف التقرير", deleteVersion: "حذف النسخة",
    details: "المعلومات", technician: "التقني", date: "التاريخ", hours: "ساعات التشغيل", hoursHint: "مثال: 1240",
    site: "الموقع", type: "نوع الصيانة", chooseDate: "اختر التاريخ",
    checklist: "قائمة فحص الصيانة", markHint: (cols: string[]) => `حدد ${cols.join(" / ")} لكل قطعة حسب الحالة.`,
    blankHint: "اترك القطعة فارغة إذا كانت سليمة.", note: "ملاحظة", addNote: "إضافة ملاحظة", noteFor: (l: string) => `إضافة ملاحظة: ${l}`,
    functionTest: "اختبار التشغيل النهائي", findings: "النتائج",
    problem: "المشكلة / العطل الموجود", work: "العمل المنفّذ", replaced: "القطع المستبدلة", required: "القطع المطلوبة",
    outcome: "الحالة النهائية", status: "حالة الماكينة", next: "الصيانة القادمة",
    saved: "تم الحفظ.", saving: "جارٍ الحفظ…", save: "حفظ التقرير", saveError: "تعذر حفظ التقرير.",
    vChecklist: "قائمة الفحص", vTests: "اختبار التشغيل", vHours: "الساعات", vSite: "الموقع", vNext: "الصيانة القادمة",
    model: MODEL_LABELS_AR, types: MAINTENANCE_TYPE_LABELS_AR, statuses: REPORT_STATUS_LABELS_AR, states: CHECK_STATE_LABELS_AR,
    machineStatus: MACHINE_STATUS_AR,
  },
};

export type ReportText = (typeof REPORT_TEXT)["en"];
