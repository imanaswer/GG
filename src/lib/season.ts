export interface Season { id: string; label: string; startsAt: Date; endsAt: Date; daysLeft: number; }

/** Per-action season-REP weights — same as the base reputation formula's base terms. */
export const SEASON_WEIGHTS = { game: 10, organized: 25, camp: 30, event: 20, workshop: 15, review: 5 } as const;

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/** The season is the calendar month containing `now` (UTC). */
export function currentSeason(now: Date): Season {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-based
  const startsAt = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const endsAt = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)); // day 0 of next month = last day
  const id = `${y}-${String(m + 1).padStart(2, "0")}`;
  const label = `${MONTHS[m]} ${y}`;
  const msPerDay = 24 * 60 * 60 * 1000;
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysLeft = Math.max(0, Math.round((endsAt.getTime() - startOfToday) / msPerDay));
  return { id, label, startsAt, endsAt, daysLeft };
}

export interface SeasonCounts { games: number; organized: number; camps: number; events: number; workshops: number; reviews: number; }

export function seasonRep(c: SeasonCounts): number {
  return (
    c.games * SEASON_WEIGHTS.game +
    c.organized * SEASON_WEIGHTS.organized +
    c.camps * SEASON_WEIGHTS.camp +
    c.events * SEASON_WEIGHTS.event +
    c.workshops * SEASON_WEIGHTS.workshop +
    c.reviews * SEASON_WEIGHTS.review
  );
}
