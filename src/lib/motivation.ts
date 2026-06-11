export interface MotivationInput {
  pointsToNext: number;
  nextTierLabel: string | null;
  streakWeeks: number;
  nearestLocked: { title: string; current: number; target: number } | null;
  topSport: string | null;
}

export function motivationFor(i: MotivationInput): string {
  if (i.pointsToNext > 0 && i.nextTierLabel) {
    return `${i.pointsToNext} REP until ${i.nextTierLabel}.`;
  }
  if (i.streakWeeks > 0) {
    return `Join 1 more game this week to keep your ${i.streakWeeks}-week streak alive.`;
  }
  if (i.nearestLocked) {
    const remaining = Math.max(1, i.nearestLocked.target - i.nearestLocked.current);
    return `Play ${remaining} more game${remaining === 1 ? "" : "s"} to unlock ${i.nearestLocked.title}.`;
  }
  return i.topSport
    ? `You're at the top — keep your ${i.topSport} game sharp! 👑`
    : "You're at the top — keep playing! 👑";
}
