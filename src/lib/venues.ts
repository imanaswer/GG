// Single source of truth for venue + slot rules. Pure functions only — no DB,
// no I/O — so the API routes (authoritative), the admin tools, and the
// create-game UI can all share exactly one definition of "bookable", "available"
// and "deletable". Mirrors the style of gameTime.ts.

import { SCHEDULE_BUFFER_MIN } from "./gameTime";

// ─── Venue status ───────────────────────────────────────────────────────────
export const VENUE_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
export type VenueStatus = (typeof VENUE_STATUSES)[number];

export function isVenueStatus(s: string): s is VenueStatus {
  return (VENUE_STATUSES as readonly string[]).includes(s);
}

/** Only ACTIVE venues may be selected for new bookings. */
export function isBookableVenue(status: string): boolean {
  return status === "ACTIVE";
}

/** Case-insensitive membership of `sport` in a venue's supportedSports. */
export function venueSupportsSport(supportedSports: string[], sport: string): boolean {
  const want = sport.trim().toLowerCase();
  return supportedSports.some((s) => s.trim().toLowerCase() === want);
}

// ─── Slot availability ──────────────────────────────────────────────────────
export type SlotUnavailableReason = "blocked" | "booked" | "expired";

export type SlotAvailability =
  | { available: true }
  | { available: false; reason: SlotUnavailableReason; message: string };

export type SlotForCheck = {
  startTime: Date | string;
  isBlocked: boolean;
  /** True when a non-cancelled game already references this slot. */
  booked: boolean;
};

// Friendly, leak-free messages. "blocked"/"booked" share the spec's wording.
const SLOT_MESSAGES: Record<SlotUnavailableReason, string> = {
  blocked: "This slot is no longer available.",
  booked: "This slot is no longer available.",
  expired: "This slot has already passed.",
};

/**
 * Whether a slot can host a NEW game *right now*. Applies the same 15-minute
 * buffer as validateGameSchedule so the picker never offers a slot the create
 * API would then reject. Order matters: blocked → booked → expired so the most
 * actionable reason wins.
 */
export function slotAvailability(slot: SlotForCheck, now: Date): SlotAvailability {
  if (slot.isBlocked) return { available: false, reason: "blocked", message: SLOT_MESSAGES.blocked };
  if (slot.booked) return { available: false, reason: "booked", message: SLOT_MESSAGES.booked };
  const start = new Date(slot.startTime).getTime();
  if (start - now.getTime() < SCHEDULE_BUFFER_MIN * 60_000) {
    return { available: false, reason: "expired", message: SLOT_MESSAGES.expired };
  }
  return { available: true };
}

export function isSlotBookable(slot: SlotForCheck, now: Date): boolean {
  return slotAvailability(slot, now).available;
}

/** Duration of a slot window in whole minutes. */
export function slotDurationMinutes(startTime: Date | string, endTime: Date | string): number {
  const ms = new Date(endTime).getTime() - new Date(startTime).getTime();
  return Math.round(ms / 60_000);
}

// ─── Deletion guards ────────────────────────────────────────────────────────
export type GuardResult = { ok: true } | { ok: false; message: string };

/** A venue with any active/upcoming games may be disabled or archived, not deleted. */
export function canDeleteVenue(activeOrUpcomingGames: number): GuardResult {
  if (activeOrUpcomingGames > 0) {
    return { ok: false, message: "This venue has active or upcoming games." };
  }
  return { ok: true };
}

/** A slot that already backs a scheduled/active game may be blocked, not deleted. */
export function canDeleteSlot(scheduledGames: number): GuardResult {
  if (scheduledGames > 0) {
    return { ok: false, message: "This slot already contains scheduled games." };
  }
  return { ok: true };
}

// ─── Bulk slot generation ───────────────────────────────────────────────────
export type SlotWindow = { startTime: Date; endTime: Date };

/**
 * Generate concrete slot windows across an inclusive local-date range, tiling
 * each day from dayStart to dayEnd into `slotMinutes`-long windows. Pure and
 * deterministic — the admin bulk generator and its tests share this. The last
 * partial window of a day (that would overrun dayEnd) is dropped.
 */
export function generateSlots(opts: {
  fromDate: string; // "YYYY-MM-DD"
  toDate: string; // "YYYY-MM-DD"
  dayStart: string; // "HH:MM"
  dayEnd: string; // "HH:MM"
  slotMinutes: number;
}): SlotWindow[] {
  const { fromDate, toDate, dayStart, dayEnd, slotMinutes } = opts;
  if (slotMinutes <= 0) return [];

  const [sh, sm] = dayStart.split(":").map(Number);
  const [eh, em] = dayEnd.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (endMin <= startMin) return [];

  const out: SlotWindow[] = [];
  // Iterate dates by their local midnight so DST never shifts the day count.
  const cursor = new Date(`${fromDate}T00:00:00`);
  const last = new Date(`${toDate}T00:00:00`);
  while (cursor.getTime() <= last.getTime()) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const d = cursor.getDate();
    for (let t = startMin; t + slotMinutes <= endMin; t += slotMinutes) {
      const startTime = new Date(y, m, d, Math.floor(t / 60), t % 60, 0, 0);
      const endTime = new Date(startTime.getTime() + slotMinutes * 60_000);
      out.push({ startTime, endTime });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}
