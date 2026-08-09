import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  campChargePaise, workshopChargePaise,
  eventChargePaise, coachChargePaise, NotPayableError,
  campAdmission, workshopAdmission, eventAdmission, coachAdmission, type Refusal,
} from "@/lib/checkout";

// A refusal here is the whole point of this route knowing the rules: better a 409
// before the gateway is called than a captured payment verify will turn away.
function refuse(r: Refusal): void {
  if (r) throw new NotPayableError(r.message, r.status);
}

// Server-authoritative order amount. The client sends only entityType + entityId;
// the price is ALWAYS derived from the database. A client-sent amount is ignored.
//
// This also applies the SAME admission rules verify applies (src/lib/checkout.ts).
// It used to ask only "is the price above zero?", so a full/closed/expired item
// still minted a live Razorpay order and the refusal arrived after the charge.
async function chargePaiseFor(entityType: string, entityId: string, now: Date): Promise<{ paise: number; currency: string }> {
  switch (entityType) {
    case "event": {
      const event = await prisma.sportEvent.findUnique({
        where: { id: entityId },
        select: {
          entryFeeAmount: true, gstPercent: true, convenienceFeePct: true, currency: true,
          status: true, published: true, participants: true, maxParticipants: true, registrationDeadline: true,
        },
      });
      if (!event) throw new NotPayableError("Event not found", 404);
      refuse(eventAdmission(event, now));
      return { paise: eventChargePaise(event), currency: event.currency || "INR" };
    }
    case "coach": {
      const coach = await prisma.coach.findUnique({
        where: { id: entityId }, select: { priceMin: true, priceMax: true, seatsLeft: true, status: true },
      });
      if (!coach) throw new NotPayableError("Coach not found", 404);
      refuse(coachAdmission(coach));
      return { paise: coachChargePaise(coach), currency: "INR" };
    }
    case "camp": {
      const camp = await prisma.camp.findUnique({
        where: { id: entityId },
        select: { price: true, status: true, participants: true, maxParticipants: true, registrationDeadline: true },
      });
      if (!camp) throw new NotPayableError("Camp not found", 404);
      refuse(campAdmission(camp, now));
      return { paise: campChargePaise(camp), currency: "INR" };
    }
    case "workshop": {
      const workshop = await prisma.workshop.findUnique({
        where: { id: entityId },
        select: { price: true, status: true, participants: true, maxParticipants: true, registrationDeadline: true },
      });
      if (!workshop) throw new NotPayableError("Workshop not found", 404);
      refuse(workshopAdmission(workshop, now));
      return { paise: workshopChargePaise(workshop), currency: "INR" };
    }
    // "game" is intentionally absent and falls through: players pay the host
    // directly for player-hosted games, so no Razorpay order may exist for one.
    default:
      throw new NotPayableError("Unsupported entityType");
  }
}

/**
 * The one admission rule verify had and this route did not: you already hold a seat.
 * It lives here rather than in checkout.ts because it is the only rule that needs IO
 * and a userId. Without it, re-registering minted a live order, Razorpay captured, and
 * verify then hit @@unique([entityId, userId]) and returned 409 — money taken, no seat.
 *
 * A `cancelled` row is deliberately NOT a blocker: it is kept only to carry a pending
 * refund (src/lib/refunds.ts), and verify revives it. Coach is absent — Booking carries
 * no unique on (userId, coachId), so repeat purchases from one coach are legal.
 */
async function alreadyRegistered(entityType: string, entityId: string, userId: string): Promise<boolean> {
  const live = { status: { not: "cancelled" } } as const;
  switch (entityType) {
    case "camp":
      return !!(await prisma.campRegistration.findFirst({ where: { campId: entityId, userId, ...live }, select: { id: true } }));
    case "workshop":
      return !!(await prisma.workshopRegistration.findFirst({ where: { workshopId: entityId, userId, ...live }, select: { id: true } }));
    case "event":
      return !!(await prisma.eventRegistration.findFirst({ where: { eventId: entityId, userId, ...live }, select: { id: true } }));
    default:
      return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const body = await req.json();
    const { entityType, entityId } = body;
    if (!entityType || !entityId) return fail("entityType, entityId required", 400);

    // Before the gateway, never after the capture.
    if (await alreadyRegistered(entityType, entityId, session.id)) {
      return fail("You are already registered for this", 409);
    }

    let amountPaise: number, currency: string;
    try {
      ({ paise: amountPaise, currency } = await chargePaiseFor(entityType, entityId, new Date()));
    } catch (e) {
      if (e instanceof NotPayableError) return fail(e.message, e.status);
      throw e;
    }

    const keyId     = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Records what this order is FOR so verify can bind order→user→entity→amount.
    const persistOrder = (orderId: string) =>
      prisma.paymentOrder.create({
        data: { razorpayOrderId: orderId, userId: session.id, entityType, entityId, amount: amountPaise, currency },
      });

    if (!keyId || !keySecret) {
      // Fail closed in production — never mint mock orders against real users/money.
      if (process.env.NODE_ENV === "production") return fail("Payments are temporarily unavailable", 503);
      // Dev only: mock order so local checkout flows can be exercised without keys.
      const orderId = `order_dev_${Date.now()}`;
      await persistOrder(orderId);
      return ok({ orderId, amount: amountPaise, currency, keyId: "rzp_test_placeholder", devMode: true });
    }

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      },
      body: JSON.stringify({ amount: amountPaise, currency, receipt: `${entityType}_${entityId}` }),
    });

    if (!res.ok) {
      // Razorpay's body is the only thing that says WHY (bad key, live mode not
      // activated, amount below the minimum). Discarding it made every cause the
      // same undiagnosable 502. keyId is public — it ships to the browser on
      // success — so its mode prefix is safe to log; the secret never is.
      const detail = await res.text().catch(() => "");
      logger.error("razorpay order creation failed", {
        status: res.status, keyMode: keyId.slice(0, 9),
        entityType, entityId, amountPaise, currency, detail: detail.slice(0, 500),
      });
      return fail("Payment gateway error", 502);
    }
    const order = await res.json() as { id: string };
    await persistOrder(order.id);
    return ok({ orderId: order.id, amount: amountPaise, currency, keyId });
  } catch (e) { return handleErr(e); }
}
