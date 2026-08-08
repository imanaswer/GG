import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  type BookingStatus,
  assertTransition,
  releasesSeat,
  refundsPayment,
  STATUS_TIMESTAMP,
  BookingConflictError,
} from "@/lib/bookingStatus";
import { flagBookingRefundDue } from "@/lib/refunds";
import type { PaymentStatus } from "@/lib/paymentStatus";
import { logOpsSafe } from "@/lib/ops";
import { logger } from "@/lib/logger";

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
      select: { id: true, status: true, coachId: true, batchId: true, userId: true, paymentStatus: true },
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

    // Cancelling or rejecting a PAID booking gives the seat back but leaves the
    // money with Game Ground. Flag it so the refund is visible instead of the
    // charge silently standing. Same rule as camps/events — see src/lib/refunds.ts.
    if (refundsPayment(to) && booking.paymentStatus === "paid") {
      if (await flagBookingRefundDue(tx, booking.id)) {
        data.paymentStatus = "refund_pending" satisfies PaymentStatus;
      }
    }

    return tx.booking.update({ where: { id }, data });
  });
}

/**
 * Tell the player what was decided. Called only AFTER transitionBooking's
 * transaction has committed — an email must never be able to roll back the
 * decision it is announcing (see lib/ops.ts).
 *
 * The player learned the outcome by opening the app and checking, if they thought
 * to. bookingApproved and bookingRejected were written for exactly this and sent
 * by nothing.
 */
async function announceDecision(bookingId: string, to: "approved" | "rejected", reason?: string | null) {
  try {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      userId: true, coachId: true,
      user:  { select: { name: true } },
      coach: { select: { name: true, address: true, phone: true } },
      batch: { select: { day: true, time: true } },
    },
  });
  if (!b) return;
  const batch = b.batch ? `${b.batch.day} ${b.batch.time}` : "1:1 session";
  logOpsSafe(() => ({
    type: to === "approved" ? "booking.approved" : "booking.rejected",
    title: to === "approved"
      ? `[GG] Booking approved — ${b.coach?.name ?? "coach"}`
      : `[GG] Booking rejected — ${b.coach?.name ?? "coach"}`,
    body: `${b.user?.name ?? "A player"} · ${batch}`,
    link: "/admin/bookings/coaches",
    entityType: "coach", entityId: b.coachId, userId: b.userId,
    dedupeKey: `booking.${to}:${bookingId}`,
    meta: {
      playerName: b.user?.name ?? "there",
      coachName: b.coach?.name ?? "your coach",
      batch,
      address: b.coach?.address ?? "",
      phone: b.coach?.phone ?? "",
      ...(reason ? { reason } : {}),
    },
  }));
  } catch (err) {
    // The decision is already committed. logOpsSafe guards the builder, but this
    // lookup sits outside it — and a read hiccup here would throw out of
    // approveBooking, so applyBulk would report a FAILED id for an action that
    // actually succeeded, and an operator would retry it.
    logger.error("booking decision announcement failed", { bookingId, to, err });
  }
}

export const approveBooking = async (id: string) => {
  const booking = await transitionBooking(id, "approved");
  await announceDecision(id, "approved");
  return booking;
};
export const rejectBooking = async (id: string, reason?: string | null) => {
  const booking = await transitionBooking(id, "rejected", { reason });
  await announceDecision(id, "rejected", reason);
  return booking;
};
export const completeBooking = (id: string) => transitionBooking(id, "completed");
export const cancelBooking = (id: string) => transitionBooking(id, "cancelled");
