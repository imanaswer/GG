// One shape for mobile numbers. The coach booking UI, /api/bookings and
// /api/payments/verify each carried their own copy of this regex.
export const PHONE_RE = /^\+?[\d\s-]{7,20}$/;

export function isValidPhone(v: string | null | undefined): boolean {
  return PHONE_RE.test((v ?? "").trim());
}

/**
 * Which number a booking should use: what the player typed, else the one already
 * on their profile. `needsInput` stays true when the saved number is missing OR
 * malformed — otherwise hiding the field would trap the user with a number they
 * cannot fix.
 */
export function resolvePhone(typed: string, saved?: string | null) {
  const savedOk = isValidPhone(saved);
  const value = typed.trim() || (savedOk ? (saved ?? "").trim() : "");
  return { value, valid: isValidPhone(value), needsInput: !savedOk };
}
