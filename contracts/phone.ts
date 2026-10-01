// Phone / WhatsApp numbers typed by customers and applicants. Shared by the forms and the API.

/** 7–15 digits (local "03 123 456" up to international "+961 70 123 456"); spaces, dashes, dots and brackets allowed. */
export function isValidPhone(value: string) {
  const v = value.trim();
  if (!/^\+?[\d\s\-().]+$/.test(v)) return false;
  const digits = v.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15;
}
