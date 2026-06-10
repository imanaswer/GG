import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  type BookingStatus,
  assertTransition,
  releasesSeat,
  STATUS_TIMESTAMP,
  BookingConflictError,
} from "@/lib/bookingStatus";

// Re-export the pure state machine so callers import everything from "@/lib/bookings".
export * from "@/lib/bookingStatus";

/**
 * Move a booking to `to`, enforcing the state machine in one transaction:
 *  - validates the transition (throws BookingTransitionError → 409)
 *  - on approval, blocks a duplicate approved booking for the same user+coach+batch
 *    (throws BookingConflictError → 409)
 *  - releases the held seat when entering cancelled/rejected
 *  - stamps the matching audit column
 */
export async function transitionBooking(
  id: string,
  to: BookingStatus,
  opts: { reason?: string | null } = {},
) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id },
      select: { id: true, status: true, coachId: true, batchId: true, userId: true },
    });
    if (!booking) throw new Error("Booking not found");

    const from = booking.status as BookingStatus;
    assertTransition(from, to);

    if (to === "approved") {
      const conflict = await tx.booking.findFirst({
        where: {
          id: { not: id },
          userId: booking.userId,
          coachId: booking.coachId,
          batchId: booking.batchId,
          status: "approved",
        },
        select: { id: true },
      });
      if (conflict) throw new BookingConflictError();
    }

    if (releasesSeat(to)) {
      await tx.coach.update({ where: { id: booking.coachId }, data: { seatsLeft: { increment: 1 } } });
      if (booking.batchId) {
        await tx.batch.update({ where: { id: booking.batchId }, data: { seats: { increment: 1 } } });
      }
    }

    const data: Prisma.BookingUpdateInput = { status: to };
    const stamp = STATUS_TIMESTAMP[to];
    if (stamp) (data as Record<string, unknown>)[stamp] = new Date();
    if (to === "rejected") data.rejectionReason = opts.reason ?? null;

    return tx.booking.update({ where: { id }, data });
  });
}

export const approveBooking = (id: string) => transitionBooking(id, "approved");
export const rejectBooking = (id: string, reason?: string | null) =>
  transitionBooking(id, "rejected", { reason });
export const completeBooking = (id: string) => transitionBooking(id, "completed");
export const cancelBooking = (id: string) => transitionBooking(id, "cancelled");
