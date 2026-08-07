import type { Prisma } from "@prisma/client";
import type { PaymentStatus } from "@/lib/paymentStatus";

// Cancelling a PAID registration releases the seat immediately, but the money is
// still with Game Ground. Every self-cancel path used to delete the registration
// row outright, which returned the seat AND destroyed the only record that a
// refund was owed — the seat could then be sold again while the first buyer's
// payment sat unreturned and invisible.
//
// One helper so games, camps, events, workshops and coach bookings can't diverge
// on this again. It marks; it does not move money. Admin's "mark-refunded" closes
// the loop once the transfer is actually made.

type Tx = Prisma.TransactionClient;

/**
 * Flag any paid Payment for (entityType, entityId, user) as refund-due.
 * Returns true when there was real money to return, so the caller can set the
 * matching status on its own registration row.
 */
export async function flagRefundDue(
  tx: Tx,
  where: { entityType: string; entityId: string; userId: string },
): Promise<boolean> {
  const paid = await tx.payment.findFirst({
    where: { ...where, status: "paid" satisfies PaymentStatus },
    select: { id: true },
  });
  if (!paid) return false;
  await tx.payment.update({
    where: { id: paid.id },
    data: { status: "refund_pending" satisfies PaymentStatus },
  });
  return true;
}

/**
 * Same, for a coach purchase. Coach payments are found by bookingId because a
 * user can book the same coach more than once, so (entityType, entityId, userId)
 * does not identify a single purchase.
 */
export async function flagBookingRefundDue(tx: Tx, bookingId: string): Promise<boolean> {
  const paid = await tx.payment.findFirst({
    where: { bookingId, status: "paid" satisfies PaymentStatus },
    select: { id: true },
  });
  if (!paid) return false;
  await tx.payment.update({
    where: { id: paid.id },
    data: { status: "refund_pending" satisfies PaymentStatus },
  });
  return true;
}
