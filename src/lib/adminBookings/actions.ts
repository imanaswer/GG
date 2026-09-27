import { prisma } from "@/lib/prisma";
import { approveBooking, rejectBooking, completeBooking, cancelBooking } from "@/lib/bookings";
import { promoteFromWaitlist } from "@/lib/waitlist";
import { markRefunded, markBookingRefunded } from "@/lib/refunds";
import { logOpsSafe } from "@/lib/ops";
import { SHARED_ACTOR, type AdminActor } from "@/lib/adminAuth";
import { sendPush } from "@/lib/push";
import type { CategoryKey } from "./types";
import type { PaymentStatus } from "@/lib/paymentStatus";

export type BookingAction =
  | "approve" | "reject" | "refund" | "complete" | "cancel"
  | "mark-paid" | "mark-refunded" | "mark-attended" | "mark-no-show";

export const ALLOWED_ACTIONS: Record<CategoryKey, BookingAction[]> = {
  coaches:         ["approve", "reject", "complete", "cancel", "mark-refunded"],
  "play-sessions": ["mark-attended", "mark-no-show", "cancel"],
  workshops:       ["cancel", "mark-paid", "mark-refunded"],
  camps:           ["cancel", "mark-paid", "mark-refunded"],
  events:          ["approve", "reject", "refund", "cancel", "mark-refunded"],
};

export function isActionAllowed(category: CategoryKey, action: BookingAction): boolean {
  return ALLOWED_ACTIONS[category].includes(action);
}

export interface ActionResult { id: string; ok: boolean; error?: string; }

// REG categories are addressed by string key, so we index the Prisma client
// dynamically. This minimal delegate shape covers the two methods we call and
// lets us drop the `any` casts.
type Delegate = {
  update: (args: unknown) => Promise<unknown>;
  findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
};
type DynamicClient = Record<string, Delegate>;

const REG = {
  camps:     { model: "campRegistration",     parent: "camp",       parentId: "campId",     counter: "participants", fullStatus: "full",  openStatus: "open",              entityType: "camp" },
  events:    { model: "eventRegistration",    parent: "sportEvent", parentId: "eventId",    counter: "participants", fullStatus: "Full",  openStatus: "Registration Open", entityType: "event" },
  workshops: { model: "workshopRegistration", parent: "workshop",   parentId: "workshopId", counter: "participants", fullStatus: "full",  openStatus: "open",              entityType: "workshop" },
} as const;

/**
 * Apply a single action to a single record. Throws on invalid action/record;
 * callers wrap each id and collect ActionResult[].
 */
export async function applyAction(
  category: CategoryKey,
  id: string,
  action: BookingAction,
  meta?: { rejectionReason?: string },
  actor?: AdminActor | null,
): Promise<void> {
  if (!isActionAllowed(category, action)) throw new Error(`Action ${action} not allowed for ${category}`);
  await applyActionInner(category, id, action, meta);
  // Written only after it actually succeeded. applyActionInner throws on every
  // refusal, and its many early `return`s all funnel through this single point,
  // so no row can ever claim an action that did not happen.
  auditAdminAction(category, id, action, actor, meta);
}

async function applyActionInner(
  category: CategoryKey,
  id: string,
  action: BookingAction,
  meta?: { rejectionReason?: string },
): Promise<void> {
  // "mark-refunded" means one thing everywhere: a human has sent the money back,
  // now close the books. Handled once, ahead of the category branches, because
  // four copies is how the ledger drifted in the first place — camps and workshops
  // updated only the registration and left Payment flagged forever, events had no
  // reachable path at all once the row was cancelled, and coaches had no action.
  //
  // It deliberately does NOT touch seat counts: the seat was released when the
  // registration was cancelled. This is bookkeeping, not a state transition.
  if (action === "mark-refunded") {
    await prisma.$transaction(async (tx) => {
      if (category === "coaches") {
        const booking = await tx.booking.findUnique({ where: { id }, select: { paymentStatus: true } });
        if (!booking) throw new Error("Not found");
        if (booking.paymentStatus === "refunded") return; // idempotent
        await markBookingRefunded(tx, id);
        await tx.booking.update({ where: { id }, data: { paymentStatus: "refunded" satisfies PaymentStatus } });
        return;
      }
      const cfg = REG[category as keyof typeof REG];
      if (!cfg) throw new Error(`Cannot mark ${category} refunded`);
      const txdb = tx as unknown as DynamicClient;
      const reg = await txdb[cfg.model].findUnique({
        where: { id },
        select: { paymentStatus: true, userId: true, [cfg.parentId]: true },
      });
      if (!reg) throw new Error("Not found");
      if (reg.paymentStatus === "refunded") return; // idempotent
      await markRefunded(tx, {
        entityType: cfg.entityType,
        entityId: String(reg[cfg.parentId]),
        userId: String(reg.userId),
      });
      await txdb[cfg.model].update({ where: { id }, data: { paymentStatus: "refunded" satisfies PaymentStatus } });
    });
    return;
  }

  if (category === "events" && (action === "approve" || action === "reject" || action === "refund" || action === "cancel")) {
    await prisma.$transaction(async (tx) => {
      const reg = await tx.eventRegistration.findUnique({
        where: { id },
        select: { status: true, eventId: true, userId: true },
      });
      if (!reg) throw new Error("Not found");

      if (action === "approve") {
        if (reg.status === "approved") return;                 // idempotent
        if (reg.status !== "pending") throw new Error(`Cannot approve a ${reg.status} registration`);
        await tx.eventRegistration.update({ where: { id }, data: { status: "approved", approvedAt: new Date() } });
        return;
      }

      // reject / refund / cancel all release the held seat exactly once.
      // rejected & cancelled are terminal + already seat-released → idempotent no-op.
      if (reg.status === "rejected" || reg.status === "cancelled") return;
      if (action === "reject" && reg.status !== "pending") throw new Error(`Cannot reject a ${reg.status} registration`);
      if (action === "refund" && reg.status !== "approved") throw new Error("Can only refund an approved registration");
      // cancel is allowed from pending or approved (the only states left here).

      // Refund a genuinely paid Payment row (free events have none) — but NOT for plain cancel.
      let paid: { id: string } | null = null;
      if (action === "reject" || action === "refund") {
        paid = await tx.payment.findFirst({
          where: { entityType: "event", entityId: reg.eventId, userId: reg.userId, status: "paid" },
          select: { id: true },
        });
        // refund_pending, like every other cancel path: the transfer happens by
        // hand in Razorpay and "mark-refunded" closes the loop. Marking it
        // refunded here hid the outstanding transfer from the ops inbox.
        if (paid) await tx.payment.update({ where: { id: paid.id }, data: { status: "refund_pending" satisfies PaymentStatus } });
      }

      await tx.eventRegistration.update({
        where: { id },
        data: {
          status: action === "reject" ? "rejected" : "cancelled",
          ...(action === "reject"
            ? { rejectedAt: new Date(), rejectionReason: meta?.rejectionReason ?? null }
            : { cancelledAt: new Date() }),
          ...(paid ? { paymentStatus: "refund_pending" satisfies PaymentStatus } : {}),
        },
      });

      // Release the held seat.
      const event = await tx.sportEvent.findUnique({ where: { id: reg.eventId }, select: { status: true } });
      await tx.sportEvent.update({
        where: { id: reg.eventId },
        data: { participants: { decrement: 1 }, status: event?.status === "Full" ? "Registration Open" : undefined },
      });
    });
    return;
  }

  if (category === "coaches") {
    if (action === "approve")  { await approveBooking(id); return; }
    if (action === "reject")   { await rejectBooking(id, meta?.rejectionReason); return; }
    if (action === "complete") { await completeBooking(id); return; }
    if (action === "cancel")   { await cancelBooking(id); return; }
    throw new Error("Unsupported coach action");
  }

  if (category === "play-sessions") {
    if (action === "mark-attended") { await prisma.gamePlayer.update({ where: { id }, data: { attended: true } }); return; }
    if (action === "mark-no-show")  { await prisma.gamePlayer.update({ where: { id }, data: { attended: false } }); return; }
    if (action === "cancel") {
      // Notified after the transaction commits — a push must never be sent for a
      // promotion that then rolls back, and it must not hold a DB connection
      // open while the transaction is still running.
      const result = await prisma.$transaction(async (tx) => {
        const gp = await tx.gamePlayer.findUnique({ where: { id }, select: { gameId: true, status: true } });
        if (!gp) throw new Error("Not found");
        if (gp.status === "cancelled") return null; // idempotent
        await tx.gamePlayer.update({ where: { id }, data: { status: "cancelled", cancelledAt: new Date() } });
        // Same rule as a player leaving: the seat goes to the queue first.
        // Note the cancelled GamePlayer row stays (it is the audit trail), so
        // promoteFromWaitlist's "already in this game" check must not match it —
        // it looks up by (gameId, userId) and a cancelled row would block a
        // legitimate promotion of a DIFFERENT user only if it were theirs.
        return promoteFromWaitlist(tx, gp.gameId);
      });

      if (result) {
        void sendPush(result.userId, {
          category: "waitlist",
          title: "A spot opened up",
          body: "You're off the waitlist and into the game.",
          data: { url: `/game/${result.gameId}` },
        });
      }
      return;
    }
    throw new Error("Unsupported play-session action");
  }

  // Registration categories (camps/events/workshops)
  const cfg = REG[category as keyof typeof REG];
  const db = prisma as unknown as DynamicClient;
  if (action === "mark-paid") {
    await db[cfg.model].update({ where: { id }, data: { paymentStatus: "paid" satisfies PaymentStatus } });
    return;
  }
  if (action === "cancel") {
    await prisma.$transaction(async (tx) => {
      const txdb = tx as unknown as DynamicClient;
      const reg = await txdb[cfg.model].findUnique({ where: { id }, select: { status: true, [cfg.parentId]: true } });
      if (!reg) throw new Error("Not found");
      if (reg.status === "cancelled") return; // idempotent
      const parentId = reg[cfg.parentId];
      await txdb[cfg.model].update({ where: { id }, data: { status: "cancelled", cancelledAt: new Date() } });
      const parent = await txdb[cfg.parent].findUnique({ where: { id: parentId }, select: { status: true } });
      await txdb[cfg.parent].update({
        where: { id: parentId },
        data: { [cfg.counter]: { decrement: 1 }, status: parent?.status === cfg.fullStatus ? cfg.openStatus : undefined },
      });
    });
    return;
  }
  throw new Error("Unsupported registration action");
}

/**
 * The audit row. This fills the placeholder that sat at the top of applyAction for
 * months — "future audit log goes here — record (category, id, action, actor, ts)."
 * It could not be written before, because the admin token carried no identity at all.
 *
 * severity "audit" means it is recorded and queryable but never notified: nobody
 * needs an email saying an admin clicked approve.
 */
function auditAdminAction(category: CategoryKey, id: string, action: BookingAction, actor: AdminActor | null | undefined, meta?: { rejectionReason?: string }) {
  logOpsSafe(() => ({
    type: "admin.action",
    severity: "audit" as const,
    title: `${actor?.name ?? SHARED_ACTOR.name} ${action} ${category}`,
    body: meta?.rejectionReason ? `Reason: ${meta.rejectionReason}` : undefined,
    entityType: category,
    entityId: id,
    actorId: actor?.id ?? SHARED_ACTOR.id,
    actorName: actor?.name ?? SHARED_ACTOR.name,
    meta: { action, category, ...(meta?.rejectionReason ? { rejectionReason: meta.rejectionReason } : {}) },
  }));
}

/**
 * Apply an action across many ids, never throwing; returns per-id results.
 *
 * `actor` is an optional trailing parameter so every existing caller and test keeps
 * compiling. When absent the audit row still lands, attributed to the shared login —
 * an unattributed action is worse than one attributed to "Shared login".
 */
export async function applyBulk(
  category: CategoryKey, ids: string[], action: BookingAction, meta?: { rejectionReason?: string },
  actor?: AdminActor | null,
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];
  for (const id of ids) {
    try {
      await applyAction(category, id, action, meta, actor);
      results.push({ id, ok: true });
    }
    catch (e) { results.push({ id, ok: false, error: e instanceof Error ? e.message : "failed" }); }
  }
  return results;
}
