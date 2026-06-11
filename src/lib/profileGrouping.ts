export type GroupStatus = "upcoming" | "completed" | "cancelled";

export function gameGroupStatus(g: { scheduledAt: string; status: string }, now: Date): GroupStatus {
  if (g.status === "cancelled") return "cancelled";
  return new Date(g.scheduledAt).getTime() > now.getTime() ? "upcoming" : "completed";
}

export function coachBookingGroupStatus(status: string): GroupStatus {
  if (status === "cancelled" || status === "rejected") return "cancelled";
  if (status === "completed") return "completed";
  return "upcoming"; // pending | approved
}

export function registrationGroupStatus(status: string, parentEnd: string, now: Date): GroupStatus {
  if (status === "cancelled") return "cancelled";
  return new Date(parentEnd).getTime() < now.getTime() ? "completed" : "upcoming";
}

export type UpcomingType = "coach" | "game" | "workshop" | "camp" | "event";
const TYPE_PRIORITY: Record<UpcomingType, number> = { coach: 1, game: 2, workshop: 3, camp: 4, event: 5 };

export interface UpcomingCandidate { type: UpcomingType; date: string | null; id: string; [k: string]: unknown; }

/**
 * Nearest dated item wins (date asc); ties broken by type priority. Coach
 * bookings (date=null, no stored session datetime) are the fallback only when
 * no dated items exist.
 */
export function selectUpcoming<T extends UpcomingCandidate>(candidates: T[]): T | null {
  const dated = candidates.filter(c => c.date != null);
  if (dated.length) {
    dated.sort((a, b) => {
      const dt = new Date(a.date as string).getTime() - new Date(b.date as string).getTime();
      return dt !== 0 ? dt : TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type];
    });
    return dated[0];
  }
  const undated = candidates.filter(c => c.date == null);
  if (!undated.length) return null;
  undated.sort((a, b) => TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type]);
  return undated[0];
}

/** Generic bucketer used by the Games/Bookings tabs. */
export function bucketByStatus<T>(items: T[], statusOf: (t: T) => GroupStatus): Record<GroupStatus, T[]> {
  const out: Record<GroupStatus, T[]> = { upcoming: [], completed: [], cancelled: [] };
  for (const it of items) out[statusOf(it)].push(it);
  return out;
}
