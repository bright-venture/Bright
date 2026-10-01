// Technician application options, shared by the public form and the dashboard.
import type { LocalText } from "./services";

export const EXPERIENCE_LEVELS = ["lt1", "1-3", "3-5", "5-10", "10+"] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const EXPERIENCE_LABELS: Record<ExperienceLevel, LocalText> = {
  lt1: { en: "Less than 1 year", ar: "أقل من سنة" },
  "1-3": { en: "1–3 years", ar: "١–٣ سنين" },
  "3-5": { en: "3–5 years", ar: "٣–٥ سنين" },
  "5-10": { en: "5–10 years", ar: "٥–١٠ سنين" },
  "10+": { en: "10+ years", ar: "أكتر من ١٠ سنين" },
};

export const AVAILABILITY = ["full_time", "part_time", "weekends"] as const;
export type Availability = (typeof AVAILABILITY)[number];

export const AVAILABILITY_LABELS: Record<Availability, LocalText> = {
  full_time: { en: "Full time", ar: "دوام كامل" },
  part_time: { en: "Part time", ar: "دوام جزئي" },
  weekends: { en: "Weekends only", ar: "بس ويك إند" },
};

/** Documents every technician applicant must upload. */
export const APPLICATION_DOCUMENTS = ["idDocument", "photo"] as const;
export type ApplicationDocument = (typeof APPLICATION_DOCUMENTS)[number];

/** Photo must be an image; the ID may be a photo or a PDF scan. */
export const DOCUMENT_TYPES: Record<ApplicationDocument, readonly string[]> = {
  idDocument: ["image/", "application/pdf"],
  photo: ["image/"],
};
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export function isAllowedDocumentType(kind: ApplicationDocument, contentType: string) {
  return DOCUMENT_TYPES[kind].some((t) => (t.endsWith("/") ? contentType.startsWith(t) : contentType === t));
}

/** Statuses a specialist sets by hand; "hired" only comes from the Hire action. */
export const MANUAL_APPLICATION_STATUSES = ["new", "contacted", "rejected"] as const;
