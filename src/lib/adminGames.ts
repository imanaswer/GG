/** Rolling 7-day window (ms) used by the dashboard "Games This Week" metric. */
export const GAMES_WEEK_MS = 7 * 86_400_000;

/**
 * Replicates the overview metric (`/api/admin/overview`):
 * a game counts as "this week" when it is open/full and scheduled no earlier
 * than 7 days ago. Uses raw millisecond arithmetic to match the metric byte-for-byte.
 */
export function isGameInMetricWeek(scheduledAt: string, status: string, now: Date): boolean {
  if (status !== "open" && status !== "full") return false;
  const t = new Date(scheduledAt).getTime();
  if (Number.isNaN(t)) return false;
  return t >= now.getTime() - GAMES_WEEK_MS;
}
