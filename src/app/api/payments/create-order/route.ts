import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  campChargePaise, workshopChargePaise, gameChargePaise,
  eventChargePaise, coachChargePaise, NotPayableError,
} from "@/lib/checkout";

// Server-authoritative order amount. The client sends only entityType + entityId;
// the price is ALWAYS derived from the database. A client-sent amount is ignored.
async function chargePaiseFor(entityType: string, entityId: string): Promise<{ paise: number; currency: string }> {
  switch (entityType) {
    case "event": {
      const event = await prisma.sportEvent.findUnique({
        where: { id: entityId },
        select: { entryFeeAmount: true, gstPercent: true, convenienceFeePct: true, currency: true },
      });
      if (!event) throw new NotPayableError("Event not found");
      return { paise: eventChargePaise(event), currency: event.currency || "INR" };
    }
    case "coach": {
      const coach = await prisma.coach.findUnique({
        where: { id: entityId }, select: { priceMin: true, priceMax: true, seatsLeft: true },
      });
      if (!coach) throw new NotPayableError("Coach not found");
      if (coach.seatsLeft <= 0) throw new NotPayableError("No seats available");
      return { paise: coachChargePaise(coach), currency: "INR" };
    }
    case "camp": {
      const camp = await prisma.camp.findUnique({ where: { id: entityId }, select: { price: true } });
      if (!camp) throw new NotPayableError("Camp not found");
      return { paise: campChargePaise(camp), currency: "INR" };
    }
    case "workshop": {
      const workshop = await prisma.workshop.findUnique({ where: { id: entityId }, select: { price: true } });
      if (!workshop) throw new NotPayableError("Workshop not found");
      return { paise: workshopChargePaise(workshop), currency: "INR" };
    }
    case "game": {
      const game = await prisma.game.findUnique({ where: { id: entityId }, select: { costAmount: true } });
      if (!game) throw new NotPayableError("Game not found");
      return { paise: gameChargePaise(game), currency: "INR" };
    }
    default:
      throw new NotPayableError("Unsupported entityType");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const body = await req.json();
    const { entityType, entityId } = body;
    if (!entityType || !entityId) return fail("entityType, entityId required", 400);

    let amountPaise: number, currency: string;
    try {
      ({ paise: amountPaise, currency } = await chargePaiseFor(entityType, entityId));
    } catch (e) {
      if (e instanceof NotPayableError) return fail(e.message, 400);
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

    if (!res.ok) return fail("Payment gateway error", 502);
    const order = await res.json() as { id: string };
    await persistOrder(order.id);
    return ok({ orderId: order.id, amount: amountPaise, currency, keyId });
  } catch (e) { return handleErr(e); }
}
