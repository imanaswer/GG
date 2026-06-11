import type { SortKey } from "./types";

export interface Pagination { page: number; pageSize: number; skip: number; take: number; }

export function parsePagination(p: URLSearchParams): Pagination {
  const page = Math.max(1, parseInt(p.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(p.get("pageSize") ?? "25", 10) || 25));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export interface DateRange { gte: Date; lte: Date; }

/** Returns a {gte, lte?} range for the requested preset, or undefined for "all". */
export function parseDateRange(p: URLSearchParams, now: Date): DateRange | undefined {
  const preset = p.get("date") ?? "all";
  if (preset === "all") return undefined;
  const startOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const endOfDay   = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
  if (preset === "today") return { gte: startOfDay(now), lte: endOfDay(now) };
  if (preset === "week") {
    const gte = startOfDay(now); gte.setUTCDate(gte.getUTCDate() - 6);
    return { gte, lte: endOfDay(now) };
  }
  if (preset === "month") {
    const gte = startOfDay(now); gte.setUTCDate(gte.getUTCDate() - 29);
    return { gte, lte: endOfDay(now) };
  }
  if (preset === "custom") {
    const from = p.get("from"); const to = p.get("to");
    if (!from) return undefined;
    const gte = startOfDay(new Date(from + "T00:00:00.000Z"));
    const lte = to ? endOfDay(new Date(to + "T00:00:00.000Z")) : endOfDay(now);
    return { gte, lte };
  }
  return undefined;
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
