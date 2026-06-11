import { istDayBounds, istWeekday } from "./query";

export type Bucket = "today" | "tomorrow" | "upcoming" | "past" | "unscheduled";

export const BUCKET_ORDER: Bucket[] = ["today", "tomorrow", "upcoming", "past", "unscheduled"];

export const BUCKET_LABELS: Record<Bucket, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  upcoming: "Upcoming",
  past: "Past",
  unscheduled: "Unscheduled",
};

export function bucketForCalendar(sessionDate: string | null | undefined, now: Date): Bucket {
  if (!sessionDate) return "unscheduled";
  const t = new Date(sessionDate).getTime();
  if (Number.isNaN(t)) return "unscheduled";
  const today = istDayBounds(now, 0);
  const tomorrow = istDayBounds(now, 1);
  if (t < today.gte.getTime()) return "past";
  if (t <= today.lte.getTime()) return "today";
  if (t <= tomorrow.lte.getTime()) return "tomorrow";
  return "upcoming";
}

const WEEKDAY_SET = new Set(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]);

export function bucketForWeekday(weekday: string | null | undefined, now: Date): Bucket {
  const day = (weekday ?? "").trim().toLowerCase();
  if (!WEEKDAY_SET.has(day)) return "unscheduled";
  if (day === istWeekday(now, 0).toLowerCase()) return "today";
  if (day === istWeekday(now, 1).toLowerCase()) return "tomorrow";
  return "upcoming";
}

export interface RowLike { sessionDate?: string | null; extra?: Record<string, string>; }

export function bucketRows<T extends RowLike>(
  rows: T[], dateMode: "calendar" | "weekday", now: Date,
): Record<Bucket, T[]> {
  const out: Record<Bucket, T[]> = { today: [], tomorrow: [], upcoming: [], past: [], unscheduled: [] };
  for (const r of rows) {
    const b = dateMode === "weekday"
      ? bucketForWeekday(r.extra?.weekday, now)
      : bucketForCalendar(r.sessionDate, now);
    out[b].push(r);
  }
  return out;
}
