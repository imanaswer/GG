import { prisma } from "@/lib/prisma";
import { approveBooking, rejectBooking, completeBooking, cancelBooking } from "@/lib/bookings";
import type { CategoryKey } from "./types";
import type { PaymentStatus } from "@/lib/paymentStatus";

export type BookingAction =
  | "approve" | "reject" | "refund" | "complete" | "cancel"
  | "mark-paid" | "mark-refunded" | "mark-attended" | "mark-no-show";

export const ALLOWED_ACTIONS: Record<CategoryKey, BookingAction[]> = {
  coaches:         ["approve", "reject", "complete", "cancel"],
  "play-sessions": ["mark-attended", "mark-no-show", "cancel"],
  workshops:       ["cancel", "mark-paid", "mark-refunded"],
  camps:           ["cancel", "mark-paid", "mark-refunded"],
  events:          ["approve", "reject", "refund", "cancel", "mark-paid", "mark-refunded"],
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
  camps:     { model: "campRegistration",     parent: "camp",       parentId: "campId",     counter: "participants", fullStatus: "full",  openStatus: "open" },
  events:    { model: "eventRegistration",    parent: "sportEvent", parentId: "eventId",    counter: "participants", fullStatus: "Full",  openStatus: "Registration Open" },
  workshops: { model: "workshopRegistration", parent: "workshop",   parentId: "workshopId", counter: "participants", fullStatus: "full",  openStatus: "open" },
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
): Promise<void> {
  if (!isActionAllowed(category, action)) throw new Error(`Action ${action} not allowed for ${category}`);

  // NOTE: future audit log goes here — record (category, id, action, actor, ts).

  if (category === "events" && (action === "approve" || action === "reject" || action === "refund")) {
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

      if (action === "reject") {
        if (reg.status === "rejected") return;                 // idempotent
        if (reg.status !== "pending") throw new Error(`Cannot reject a ${reg.status} registration`);
      } else { // refund
        if (reg.status === "cancelled") return;                // idempotent
        if (reg.status !== "approved") throw new Error("Can only refund an approved registration");
      }

      // Refund ONLY a genuinely paid Payment row (free events store paymentStatus
      // "paid" with no Payment row — they must not be marked refunded).
      const paid = await tx.payment.findFirst({
        where: { entityType: "event", entityId: reg.eventId, userId: reg.userId, status: "paid" },
        select: { id: true },
      });
      if (paid) await tx.payment.update({ where: { id: paid.id }, data: { status: "refunded" satisfies PaymentStatus } });

      await tx.eventRegistration.update({
        where: { id },
        data: {
          status: action === "reject" ? "rejected" : "cancelled",
          ...(action === "reject"
            ? { rejectedAt: new Date(), rejectionReason: meta?.rejectionReason ?? null }
            : { cancelledAt: new Date() }),
          ...(paid ? { paymentStatus: "refunded" satisfies PaymentStatus } : {}),
        },
      });

      // Release the held seat (mirror the generic cancel branch).
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
      await prisma.$transaction(async (tx) => {
        const gp = await tx.gamePlayer.findUnique({ where: { id }, select: { gameId: true, status: true } });
        if (!gp) throw new Error("Not found");
        if (gp.status === "cancelled") return; // idempotent
        await tx.gamePlayer.update({ where: { id }, data: { status: "cancelled", cancelledAt: new Date() } });
        const game = await tx.game.findUnique({ where: { id: gp.gameId }, select: { status: true } });
        await tx.game.update({
          where: { id: gp.gameId },
          data: { slotsLeft: { increment: 1 }, status: game?.status === "full" ? "open" : undefined },
        });
      });
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
  if (action === "mark-refunded") {
    await db[cfg.model].update({ where: { id }, data: { paymentStatus: "refunded" satisfies PaymentStatus } });
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

/** Apply an action across many ids, never throwing; returns per-id results. */
export async function applyBulk(
  category: CategoryKey, ids: string[], action: BookingAction, meta?: { rejectionReason?: string },
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];
  for (const id of ids) {
    try { await applyAction(category, id, action, meta); results.push({ id, ok: true }); }
    catch (e) { results.push({ id, ok: false, error: e instanceof Error ? e.message : "failed" }); }
  }
  return results;
}
