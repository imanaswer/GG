export type EventCharge = { base: number; gst: number; convenience: number; total: number }; // all rupees

/**
 * Authoritative charge for a paid event: both percentages applied to the base
 * fee, each component rounded to the nearest rupee, then summed. Pure — the
 * single source of truth for server (× 100 → paise) and client (display).
 */
export function computeEventCharge(e: { entryFeeAmount: number; gstPercent?: number; convenienceFeePct?: number }): EventCharge {
  const base = Math.max(0, Math.round(e.entryFeeAmount || 0));
  const gst = Math.round(base * (e.gstPercent ?? 0) / 100);
  const convenience = Math.round(base * (e.convenienceFeePct ?? 0) / 100);
  return { base, gst, convenience, total: base + gst + convenience };
}
