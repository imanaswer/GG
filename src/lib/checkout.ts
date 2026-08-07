// Server-authoritative payment charges. The single source of truth for how much
// a paid entity costs, in PAISE, derived only from DB-selected fields — never from
// a client-sent amount. Pure / no IO, so create-order and verify cannot drift and
// the rules are unit-testable (matches eventPricing.ts / coachPayment.ts).
import { computeEventCharge } from "./eventPricing";
import { coachInstantChargeRupees, type CoachPrice } from "./coachPayment";

/** Entity is not in a payable state (free, or coach not instant-pay eligible). Routes map this to a 400. */
export class NotPayableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotPayableError";
  }
}

// Camp/Workshop.price and Game.costAmount are stored in RUPEES (the client posts
// the raw rupee value today; create-order multiplied it by 100). Round defensively.
const rupeesToPaise = (rupees: number): number => Math.round(rupees) * 100;

export function campChargePaise(c: { price: number }): number {
  const paise = rupeesToPaise(c.price);
  if (paise <= 0) throw new NotPayableError("This is a free camp");
  return paise;
}

export function workshopChargePaise(w: { price: number }): number {
  const paise = rupeesToPaise(w.price);
  if (paise <= 0) throw new NotPayableError("This is a free workshop");
  return paise;
}

// There is deliberately no gameChargePaise. Player-hosted games are paid host-to-
// player outside Game Ground: no order is created, no Payment row is written, and
// nothing here may be given a price for a game. See src/lib/hostPayment.ts.

export function eventChargePaise(
  e: { entryFeeAmount: number; gstPercent?: number; convenienceFeePct?: number },
): number {
  const paise = computeEventCharge(e).total * 100;
  if (paise <= 0) throw new NotPayableError("This is a free event");
  return paise;
}

/** Coach instant-pay charge in paise. Throws NotPayableError if not a single fixed price. */
export function coachChargePaise(c: CoachPrice): number {
  try {
    return coachInstantChargeRupees(c) * 100;
  } catch {
    throw new NotPayableError("This coach is not available for instant pay");
  }
}

// ─── Order binding (cross-entity replay guard) ─────────────────────────────────
export type OrderRecord = { userId: string; entityType: string; entityId: string; amount: number };
export type BindingResult = { ok: true } | { ok: false; status: number; message: string };

/**
 * Assert a persisted order (from create-order) belongs to the caller and the item
 * being verified. Pure — the single decision point for order↔user↔entity binding.
 * A signed order/payment for one entity can't be redeemed against another.
 */
export function assertOrderBinding(
  order: OrderRecord | null,
  expected: { userId: string; entityType: string; entityId: string },
): BindingResult {
  if (!order) return { ok: false, status: 400, message: "Unknown or expired order" };
  if (order.userId !== expected.userId) return { ok: false, status: 403, message: "This order does not belong to you" };
  if (order.entityType !== expected.entityType || order.entityId !== expected.entityId) {
    return { ok: false, status: 400, message: "Order does not match this item" };
  }
  return { ok: true };
}
