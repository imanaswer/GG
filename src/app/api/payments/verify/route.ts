import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";
import crypto from "crypto";

type Body = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  entityType: "camp" | "event" | "game";
  entityId: string;
  amount: number;
  registration: { childName?: string; childAge?: number; teamName?: string };
  devMode?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const body = (await req.json()) as Body;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, entityType, entityId, amount, registration, devMode } = body;
    if (!entityType || !entityId) return fail("entityType and entityId required", 400);

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const liveVerification = !devMode && keySecret;
    if (liveVerification) {
      const expected = crypto.createHmac("sha256", keySecret!)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
      if (expected !== razorpay_signature) return fail("Invalid payment signature", 400);
    }

    if (entityType === "camp") {
      const { childName, childAge } = registration ?? {};
      if (!childName || !childAge) return fail("childName and childAge are required", 400);

      const camp = await prisma.camp.findUnique({ where: { id: entityId }, select: { participants: true, maxParticipants: true } });
      if (!camp) return fail("Camp not found", 404);
      if (camp.participants >= camp.maxParticipants) return fail("Camp is full", 400);

      const existing = await prisma.campRegistration.findFirst({ where: { campId: entityId, userId: session.id }, select: { id: true } });
      if (existing) return fail("Already registered", 409);

      const statusUpdate = camp.participants + 1 >= camp.maxParticipants ? "full" : undefined;
      await prisma.$transaction([
        prisma.payment.create({
          data: {
            userId: session.id, entityType, entityId,
            razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id,
            amount: amount ?? 0, currency: "INR",
            status: "paid", paidAt: new Date(),
          },
        }),
        prisma.campRegistration.create({
          data: { campId: entityId, userId: session.id, childName, childAge: parseInt(String(childAge)), paymentStatus: "paid" },
        }),
        prisma.camp.update({ where: { id: entityId }, data: { participants: { increment: 1 }, status: statusUpdate } }),
      ]);
      return ok({ verified: true });
    }

    if (entityType === "event") {
      const { teamName } = registration ?? {};
      const event = await prisma.sportEvent.findUnique({ where: { id: entityId }, select: { participants: true, maxParticipants: true, registrationDeadline: true } });
      if (!event) return fail("Event not found", 404);
      if (event.participants >= event.maxParticipants) return fail("Event is full", 400);
      if (event.registrationDeadline < new Date()) return fail("Registration deadline has passed", 400);

      const existing = await prisma.eventRegistration.findFirst({ where: { eventId: entityId, userId: session.id }, select: { id: true } });
      if (existing) return fail("Already registered", 409);

      const statusUpdate = event.participants + 1 >= event.maxParticipants ? "Full" : undefined;
      await prisma.$transaction([
        prisma.payment.create({
          data: {
            userId: session.id, entityType, entityId,
            razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id,
            amount: amount ?? 0, currency: "INR",
            status: "paid", paidAt: new Date(),
          },
        }),
        prisma.eventRegistration.create({ data: { eventId: entityId, userId: session.id, teamName, paymentStatus: "paid" } }),
        prisma.sportEvent.update({ where: { id: entityId }, data: { participants: { increment: 1 }, status: statusUpdate } }),
      ]);
      return ok({ verified: true });
    }

    if (entityType === "game") {
      const game = await prisma.game.findUnique({ where: { id: entityId }, select: { organizerId: true, slotsLeft: true, status: true } });
      if (!game) return fail("Game not found", 404);
      if (game.organizerId === session.id) return fail("You cannot join your own game", 400);
      if (game.slotsLeft <= 0 || game.status === "full") return fail("Game is full", 400);

      const already = await prisma.gamePlayer.findUnique({ where: { gameId_userId: { gameId: entityId, userId: session.id } }, select: { id: true } });
      if (already) return fail("Already joined this game", 409);

      const newSlotsLeft = game.slotsLeft - 1;
      await prisma.$transaction([
        prisma.payment.create({
          data: {
            userId: session.id, entityType, entityId,
            razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id,
            amount: amount ?? 0, currency: "INR",
            status: "paid", paidAt: new Date(),
          },
        }),
        prisma.gamePlayer.create({ data: { gameId: entityId, userId: session.id } }),
        prisma.game.update({ where: { id: entityId }, data: { slotsLeft: { decrement: 1 }, status: newSlotsLeft === 0 ? "full" : undefined } }),
        prisma.user.update({ where: { id: session.id }, data: { gamesPlayed: { increment: 1 } } }),
      ]);
      return ok({ verified: true, slotsLeft: newSlotsLeft });
    }

    return fail("Unsupported entityType", 400);
  } catch (e) { return handleErr(e); }
}
