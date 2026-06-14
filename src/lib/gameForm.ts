// Small pure helpers for the create-game form. Kept out of the component so they
// can be unit-tested and reused.

/** Human default title when the host doesn't type one. */
export function defaultGameTitle(skillLevel: string, sport: string, venueName: string): string {
  const base = [skillLevel, sport].filter(Boolean).join(" ").trim() || "Pickup game";
  return venueName ? `${base} at ${venueName}` : base;
}

/** Rupee cost label from a whole-rupee amount. */
export function formatCost(amount: number): string {
  return amount > 0 ? `₹${amount}` : "Free";
}
