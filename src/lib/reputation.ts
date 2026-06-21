export const TIERS = ["bronze", "silver", "gold", "elite", "pro"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_META: Record<Tier, { label: string; icon: string; color: string; colorDim: string }> = {
  bronze: { label: "Bronze", icon: "🥉", color: "#a16207", colorDim: "#78350f" },
  silver: { label: "Silver", icon: "🥈", color: "#94a3b8", colorDim: "#475569" },
  gold:   { label: "Gold",   icon: "🥇", color: "#eab308", colorDim: "#a16207" },
  elite:  { label: "Elite",  icon: "💎", color: "#60a5fa", colorDim: "#1e40af" },
  pro:    { label: "Pro",    icon: "👑", color: "#980808", colorDim: "#991b1b" },
};

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

export type TierLevelInfo = {
  tier: Tier;
  label: string;
  icon: string;
  color: string;
  colorDim: string;
  score: number;
  floor: number;
  progressPct: number;
  next: { tier: Tier; label: string; pointsRequired: number; pointsToNext: number } | null;
};

export function tierLevelInfo(score: number): TierLevelInfo {
  const { current, next, pct, pointsToNext } = progressToNextTier(score);
  const meta = TIER_META[current];
  return {
    tier: current,
    label: meta.label,
    icon: meta.icon,
    color: meta.color,
    colorDim: meta.colorDim,
    score,
    floor: TIER_THRESHOLDS[current],
    progressPct: pct,
    next: next
      ? { tier: next, label: TIER_META[next].label, pointsRequired: TIER_THRESHOLDS[next], pointsToNext }
      : null,
  };
}

export function monthsBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, ms / (1000 * 60 * 60 * 24 * 30.4375));
}

export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, ms / (1000 * 60 * 60 * 24));
}
