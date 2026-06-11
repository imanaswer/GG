import type { SortKey } from "./types";

export interface Pagination { page: number; pageSize: number; skip: number; take: number; }

export function parsePagination(p: URLSearchParams): Pagination {
  const page = Math.max(1, parseInt(p.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(p.get("pageSize") ?? "25", 10) || 25));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export const IST_OFFSET_MIN = 330; // Asia/Kolkata, fixed +5:30, no DST

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** IST weekday name for the day `offsetDays` from `now`. */
export function istWeekday(now: Date, offsetDays = 0): string {
  const ist = new Date(now.getTime() + IST_OFFSET_MIN * 60_000 + offsetDays * 86_400_000);
  return WEEKDAYS[ist.getUTCDay()];
}

/** UTC instant bounds for the IST calendar day `offsetDays` from `now`. */
export function istDayBounds(now: Date, offsetDays = 0): { gte: Date; lte: Date } {
  const ist = new Date(now.getTime() + IST_OFFSET_MIN * 60_000);
  const y = ist.getUTCFullYear(), mo = ist.getUTCMonth(), d = ist.getUTCDate() + offsetDays;
  return istDayBoundsFor(y, mo, d);
}

function istDayBoundsFor(y: number, moZeroBased: number, d: number): { gte: Date; lte: Date } {
  const startUtc = Date.UTC(y, moZeroBased, d, 0, 0, 0, 0) - IST_OFFSET_MIN * 60_000;
  const endUtc = Date.UTC(y, moZeroBased, d, 23, 59, 59, 999) - IST_OFFSET_MIN * 60_000;
  return { gte: new Date(startUtc), lte: new Date(endUtc) };
}

/** Both bounds optional: `upcoming` has only gte, `past` has only lte. */
export interface DateRange { gte?: Date; lte?: Date; }

/** Returns a UTC {gte?, lte?} range for the requested IST preset, or undefined for "all". */
export function parseDateRange(p: URLSearchParams, now: Date): DateRange | undefined {
  const preset = p.get("date") ?? "all";
  if (preset === "all") return undefined;
  if (preset === "today") return istDayBounds(now, 0);
  if (preset === "tomorrow") return istDayBounds(now, 1);
  if (preset === "upcoming") return { gte: istDayBounds(now, 0).gte };
  if (preset === "past") return { lte: new Date(istDayBounds(now, 0).gte.getTime() - 1) };
  if (preset === "custom") {
    const from = p.get("from"); const to = p.get("to");
    if (!from) return undefined;
    const fromBounds = istDayFromString(from);
    const toBounds = to ? istDayFromString(to) : istDayBounds(now, 0);
    return { gte: fromBounds.gte, lte: toBounds.lte };
  }
  return undefined;
}

function istDayFromString(s: string): { gte: Date; lte: Date } {
  const [y, mo, d] = s.split("-").map(Number);
  return istDayBoundsFor(y, mo - 1, d);
}

/** Maps a sort key to a Prisma orderBy. `createdField` is the row's creation
 *  timestamp column (createdAt/registeredAt/joinedAt). */
export function orderByFor(sort: SortKey, createdField: string, sessionField: string): Record<string, "asc" | "desc"> {
  switch (sort) {
    case "oldest":   return { [createdField]: "asc" };
    case "upcoming": return { [sessionField]: "asc" };
    case "updated":  return { updatedAt: "desc" };
    case "newest":
    default:         return { [createdField]: "desc" };
  }
}

export function parseSort(p: URLSearchParams): SortKey {
  const s = p.get("sort");
  return (s === "oldest" || s === "upcoming" || s === "updated") ? s : "newest";
}
