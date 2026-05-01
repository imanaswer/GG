export const TIERS = ["bronze", "silver", "gold", "elite", "pro"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_THRESHOLDS: Record<Tier, number> = {
  bronze: 0,
  silver: 100,
  gold: 300,
  elite: 700,
  pro: 1500,
};

export const REVIEWS_GIVEN_CAP = 10;

export type ReputationInput = {
  gamesPlayed: number;
  gamesOrganized: number;
  attendanceRate: number;
  reviewsGiven: number;
  campsCompleted: number;
  eventsParticipated: number;
  workshopsAttended: number;
  accountAgeMonths: number;
  daysSinceLastActivity: number;
};

export function computeReputation(input: ReputationInput): number {
  const cappedReviews = Math.min(input.reviewsGiven, REVIEWS_GIVEN_CAP);

  const base =
    input.gamesPlayed         * 10 +
    input.gamesOrganized      * 25 +
    cappedReviews             *  5 +
    input.campsCompleted      * 30 +
    input.eventsParticipated  * 20 +
    input.workshopsAttended   * 15;

  const attendanceMultiplier = Math.max(0.5, input.attendanceRate / 100);
  const ageBonus = Math.min(100, input.accountAgeMonths * 8);
  const decayMonths = Math.floor(input.daysSinceLastActivity / 30);
  const decayMultiplier = Math.max(0.5, 1 - decayMonths * 0.1);

  return Math.max(0, Math.round((base * attendanceMultiplier + ageBonus) * decayMultiplier));
}

export function getTier(score: number): Tier {
  if (score >= TIER_THRESHOLDS.pro)    return "pro";
  if (score >= TIER_THRESHOLDS.elite)  return "elite";
  if (score >= TIER_THRESHOLDS.gold)   return "gold";
  if (score >= TIER_THRESHOLDS.silver) return "silver";
  return "bronze";
}

export function nextTier(tier: Tier): Tier | null {
  const idx = TIERS.indexOf(tier);
  return idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}

export function progressToNextTier(score: number): { current: Tier; next: Tier | null; pct: number; pointsToNext: number } {
  const current = getTier(score);
  const next = nextTier(current);
  if (!next) return { current, next: null, pct: 100, pointsToNext: 0 };
  const lo = TIER_THRESHOLDS[current];
  const hi = TIER_THRESHOLDS[next];
  const span = hi - lo;
  const pct = Math.max(0, Math.min(100, Math.round(((score - lo) / span) * 100)));
  return { current, next, pct, pointsToNext: Math.max(0, hi - score) };
}

export function monthsBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, ms / (1000 * 60 * 60 * 24 * 30.4375));
}

export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, ms / (1000 * 60 * 60 * 24));
}
