// Single source of truth for game scheduling + join rules.
// Imported by both the API routes (authoritative) and the create-game UI
// so the two can never disagree. Pure functions only — no DB, no I/O.

export const SCHEDULE_BUFFER_MIN = 15;

/**
 * Self-cancellation is refused inside this window before start. One home for the
 * policy — games, camps and events all import it, so a change can't land in two
 * of the three. The user-facing message is derived from the same number.
 */
export const CANCEL_CUTOFF_MIN = 90;
export const CANCEL_CUTOFF_MS = CANCEL_CUTOFF_MIN * 60_000;
export const CANCEL_CUTOFF_MESSAGE =
  `Cancellation is not allowed within ${CANCEL_CUTOFF_MIN} minutes of the start time`;

/** True if `start` is inside the cancellation cutoff (or already past). */
export function withinCancelCutoff(start: Date | string, now: Date): boolean {
  return new Date(start).getTime() - now.getTime() < CANCEL_CUTOFF_MS;
}

export type TimeSlot = { value: string; label: string };

/** All slots in a day at `intervalMin` spacing. value = "HH:MM" (24h), label = "h:MM AM/PM". */
export function timeSlots(intervalMin = 15): TimeSlot[] {
  const out: TimeSlot[] = [];
  for (let m = 0; m < 24 * 60; m += intervalMin) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const value = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    const period = h < 12 ? "AM" : "PM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    out.push({ value, label: `${h12}:${String(min).padStart(2, "0")} ${period}` });
  }
  return out;
}

/** True if `slotValue` on `dateStr` (local) is at or before `now`. */
export function isSlotPast(slotValue: string, dateStr: string, now: Date): boolean {
  const slot = new Date(`${dateStr}T${slotValue}:00`);
  return slot.getTime() <= now.getTime();
}

export type ScheduleResult = { ok: true } | { ok: false; message: string };

/** Reject past times and times inside the booking buffer. */
export function validateGameSchedule(scheduledAtISO: string, now: Date): ScheduleResult {
  const when = new Date(scheduledAtISO).getTime();
  const diffMs = when - now.getTime();
  if (diffMs <= 0) return { ok: false, message: "This game cannot be scheduled in the past." };
  if (diffMs < SCHEDULE_BUFFER_MIN * 60_000) {
    return { ok: false, message: "Games must be scheduled at least 15 minutes in advance." };
  }
  return { ok: true };
}

export type JoinableGame = {
  organizerId: string;
  status: string;
  scheduledAt: Date | string;
  duration: number; // minutes
};

const CLOSED_STATUSES = ["cancelled", "completed", "archived"];

/**
 * First failing reason a user cannot join, or null if joinable.
 * Host check runs first (prevents duplicate participation), then status,
 * then ended-before-started so the more specific message wins.
 * Slot-availability and already-joined live in the route (they need extra queries).
 */
export function joinability(game: JoinableGame, now: Date, userId: string): string | null {
  if (game.organizerId === userId) return "You are already the host of this game.";
  if (CLOSED_STATUSES.includes(game.status)) return "This game is no longer accepting players.";
  const start = new Date(game.scheduledAt).getTime();
  const end = start + game.duration * 60_000;
  if (now.getTime() >= end) return "This game has already ended.";
  if (now.getTime() >= start) return "This game has already started.";
  return null;
}
