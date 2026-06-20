// Pure rules for instant ("pay & book") coach sessions. No Prisma / IO — unit-testable.
// Instant pay is offered when the coach has a single fixed price. A single price is
// stored either as priceMin === priceMax, or — per the admin form's "leave 0 for single
// price" convention — as priceMin > 0 with priceMax === 0 (matching formatPrice()).
// Coaches with a genuine price range or no price stay request-only (free, admin-confirmed).

export interface CoachPrice {
  priceMin: number;
  priceMax: number;
}

export function isInstantPayEligible(coach: CoachPrice): boolean {
  return coach.priceMin > 0 && (coach.priceMax === 0 || coach.priceMax === coach.priceMin);
}

/** Charge amount in RUPEES. Throws if the coach is not instant-pay eligible. */
export function coachInstantChargeRupees(coach: CoachPrice): number {
  if (!isInstantPayEligible(coach)) {
    throw new Error("Coach is not eligible for instant pay");
  }
  return coach.priceMin;
}
