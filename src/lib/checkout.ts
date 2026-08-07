// Server-authoritative payment charges. The single source of truth for how much
// a paid entity costs, in PAISE, derived only from DB-selected fields — never from
// a client-sent amount. Pure / no IO, so create-order and verify cannot drift and
// the rules are unit-testable (matches eventPricing.ts / coachPayment.ts).
import { computeEventCharge } from "./eventPricing";
import { coachInstantChargeRupees, type CoachPrice } from "./coachPayment";

/** Entity is not in a payable state (free, closed, full, or coach not instant-pay eligible). */
export class NotPayableError extends Error {
  constructor(message: string, readonly status = 400) {
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

// ─── Admission gates ───────────────────────────────────────────────────────────
// create-order used to ask one question — "is the price above zero?" — while
// verify applied a much longer list. Every rule verify had and create-order did
// not was a case where the user completed payment and was then refused: money
// taken, nothing granted, and only an orphaned PaymentOrder to show for it.
// These are the single copy of those rules, called from create-order AND verify,
// and worded to match the free-register endpoints so a paid and a free refusal
// read the same. Pure / no IO, like the charge functions above.

/** Why the purchase can't proceed, with the status the route should return. Null = admissible. */
export type Refusal = { message: string; status: number } | null;

const CAMP_CLOSED     = ["closed", "completed", "archived"];
const WORKSHOP_CLOSED = ["closed", "completed", "archived"];
const EVENT_CLOSED    = ["Cancelled", "Completed", "Archived", "Full"];

export function campAdmission(
  c: { status: string; participants: number; maxParticipants: number; registrationDeadline: Date },
  now: Date,
): Refusal {
  if (CAMP_CLOSED.includes(c.status)) return { message: "Registrations are closed for this camp", status: 409 };
  if (c.participants >= c.maxParticipants) return { message: "Camp is full", status: 400 };
  if (c.registrationDeadline < now) return { message: "Registration deadline has passed", status: 400 };
  return null;
}

export function workshopAdmission(
  w: { status: string; participants: number; maxParticipants: number; registrationDeadline: Date },
  now: Date,
): Refusal {
  if (WORKSHOP_CLOSED.includes(w.status)) return { message: "Registrations are closed for this workshop", status: 409 };
  if (w.participants >= w.maxParticipants) return { message: "Workshop is full", status: 400 };
  if (w.registrationDeadline < now) return { message: "Registration deadline has passed", status: 400 };
  return null;
}

export function eventAdmission(
  e: { status: string; published: boolean; participants: number; maxParticipants: number; registrationDeadline: Date },
  now: Date,
): Refusal {
  // Status and published were checked on the free path only, so a Cancelled event
  // whose deadline had not yet passed still took money.
  if (EVENT_CLOSED.includes(e.status) || !e.published) return { message: "Registrations are closed for this event", status: 409 };
  if (e.participants >= e.maxParticipants) return { message: "Event is full", status: 400 };
  if (e.registrationDeadline < now) return { message: "Registration deadline has passed", status: 400 };
  return null;
}

/**
 * A coach must be approved before anyone can book or pay for them. Self-service
 * registration creates the row as "pending_approval"; only an admin makes it
 * "active". Nothing checked this, so a coach was bookable the moment they signed
 * up — before a human had looked at them.
 */
export function coachAdmission(c: { status: string; seatsLeft: number }): Refusal {
  if (c.status !== "active") return { message: "This coach is not accepting bookings", status: 409 };
  if (c.seatsLeft <= 0) return { message: "No seats available", status: 400 };
  return null;
}
