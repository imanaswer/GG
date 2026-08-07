import { prisma } from "@/lib/prisma";

// Coach bookings finish on a timer, because nothing in the data says when a
// coaching engagement actually ends.
//
// `Booking` has createdAt / approvedAt / completedAt and no session date.
// `Batch` stores `day` and `time` as recurring weekday strings ("Monday",
// "6:00 PM") with no end. So there is no date to derive this from — the window
// below is a POLICY, not a computation, and it is deliberately a single tunable
// rather than a number buried in a query.
//
// Why it has to exist at all: a review is a 403 until a booking reaches
// "completed", and only an admin could move it there. Every review in the
// product was gated behind a manual click nobody was told to make.
//
// ponytail: one global window. The upgrade path is a real end date on Booking,
// set by the coach when they define the engagement — at which point this becomes
// the fallback for bookings that have none, rather than the only rule.

const DEFAULT_DAYS = 30;

/**
 * Days after approval that an approved booking is treated as finished.
 * Override with COACH_AUTO_COMPLETE_DAYS. A non-positive or unparseable value
 * falls back to the default rather than completing everything instantly.
 */
export function autoCompleteDays(): number {
  const raw = Number(process.env.COACH_AUTO_COMPLETE_DAYS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_DAYS;
}

export const autoCompleteWindowMs = () => autoCompleteDays() * 86_400_000;

/**
 * Approved bookings whose window has elapsed.
 *
 * `approvedAt: { not: null }` matters — a booking approved before that column
 * existed has no reference point, and completing those on the strength of a
 * missing timestamp would sweep up live enrollments.
 */
export async function findAutoCompletable(
  now: Date,
  limit = 200,
): Promise<{ id: string; userId: string; coachId: string }[]> {
  const cutoff = new Date(now.getTime() - autoCompleteWindowMs());
  return prisma.booking.findMany({
    where: {
      status: "approved",
      approvedAt: { not: null, lt: cutoff },
    },
    select: { id: true, userId: true, coachId: true },
    orderBy: { approvedAt: "asc" },
    take: limit,
  });
}
