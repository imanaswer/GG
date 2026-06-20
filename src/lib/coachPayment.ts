// Pure rules for instant ("pay & book") coach sessions. No Prisma / IO — unit-testable.
// Instant pay is offered ONLY when the coach has a single fixed price (priceMin === priceMax > 0).
// Coaches with a price range or no price stay request-only (free, admin-confirmed).

export interface CoachPrice {
  priceMin: number;
  priceMax: number;
}

export function isInstantPayEligible(coach: CoachPrice): boolean {
  return coach.priceMin > 0 && coach.priceMin === coach.priceMax;
}

/** Charge amount in RUPEES. Throws if the coach is not instant-pay eligible. */
export function coachInstantChargeRupees(coach: CoachPrice): number {
  if (!isInstantPayEligible(coach)) {
    throw new Error("Coach is not eligible for instant pay");
  }
  return coach.priceMin;
}
