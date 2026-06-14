// WhatsApp deep-link helpers.
//
// User.phone is a free-text field (placeholder "+91 98765 43210"), so stored
// values vary: "+91 98765 43210", "09876543210", "9876543210". wa.me only
// accepts bare international digits — no "+", spaces, dashes or leading zero —
// so every number must be normalized before it can be linked.

const IN_COUNTRY_CODE = "91"; // Kozhikode-first product; matches the about-page support number.

/**
 * Normalize a free-text phone into wa.me digits, or return null when the input
 * can't be turned into a usable number.
 *
 * Rules: strip everything that isn't a digit, drop a single leading 0, and if
 * the result is a bare 10-digit Indian mobile prepend the country code.
 */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  if (digits.length === 10) digits = IN_COUNTRY_CODE + digits;
  // A valid number is country code + at least a 10-digit subscriber number.
  return digits.length >= 11 ? digits : null;
}

/** Build a wa.me chat link to a specific person, or null if the number is unusable. */
export function whatsAppLink(phone: string | null | undefined, text?: string): string | null {
  const number = toWhatsAppNumber(phone);
  if (!number) return null;
  return text ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : `https://wa.me/${number}`;
}
