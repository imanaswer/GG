export const SPORTS = [
  "Football", "Cricket", "Basketball", "Badminton", "Tennis",
  "Swimming", "Table Tennis", "Volleyball", "Athletics",
  "Fitness", "Multi-Sport",
] as const;

/**
 * Build the display price string for a coach.
 * A blank/0 max price means a single price (e.g. "₹500"); otherwise a range
 * ("₹500–1500"). Used everywhere the stored `price` string is written so the
 * DB value and UI stay consistent.
 */
export function formatPrice(min: number | string, max: number | string): string {
  const lo = Number(min) || 0;
  const hi = Number(max) || 0;
  return hi > 0 && hi !== lo ? `₹${lo}–${hi}` : `₹${lo}`;
}

export const SKILL_LEVELS = ["All Levels", "Beginner", "Intermediate", "Advanced"] as const;

export const COACH_TYPES = ["Academy", "Personal Trainer", "Training Center", "Sports Club"] as const;

export const EVENT_TYPES = [
  "Tournament", "League", "Championship", "Marathon",
  "Festival", "Workshop", "Seminar", "Fun Match", "Exhibition",
] as const;

export const EVENT_DIFFICULTIES = ["All Levels", "Beginner", "Intermediate", "Advanced"] as const;

export const EVENT_STATUSES = ["Registration Open", "Live", "Completed", "Cancelled", "Full", "Archived"] as const;

export const CAMP_STATUSES = ["open", "full", "closed", "completed", "archived"] as const;

export const WORKSHOP_SESSION_TYPES = ["single", "series"] as const;

export const WORKSHOP_AUDIENCE_TYPES = ["youth", "adult", "all"] as const;

export const WORKSHOP_STATUSES = ["open", "full", "completed", "archived"] as const;
