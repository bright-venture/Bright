/** tel: link with only the characters dialers accept. */
export function telLink(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** WhatsApp wants the number in international form, digits only (Lebanon: 961…). */
export function whatsappLink(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `961${digits.slice(1)}`;
  else if (digits.length <= 8) digits = `961${digits}`;
  return `https://wa.me/${digits}`;
}
