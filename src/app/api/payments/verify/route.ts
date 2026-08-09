import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr, ApiError } from "@/lib/api";
import { PaymentStatus } from "@/lib/paymentStatus";
import { logOpsSafe } from "@/lib/ops";
import { logger } from "@/lib/logger";
import {
  campChargePaise, workshopChargePaise,
  eventChargePaise, coachChargePaise, assertOrderBinding, NotPayableError,
  campAdmission, workshopAdmission, eventAdmission, coachAdmission,
} from "@/lib/checkout";
import crypto from "crypto";

type Body = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  entityType: "camp" | "event" | "workshop" | "coach";
  entityId: string;
  registration: { childName?: string; childAge?: number; teamName?: string; participantName?: string; participantAge?: number; registrationType?: string; batchId?: string; phone?: string; note?: string };
  devMode?: boolean;
};

// Maps transaction failures to clean HTTP responses. ApiError → its status;
// a unique-constraint violation (duplicate registration / replayed payment id)
// → 409; anything else rethrows to the outer handleErr.
function txError(e: unknown) {
  if (e instanceof ApiError) return fail(e.message, e.status);
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    return fail("You have already registered — no duplicate charge was created", 409);
  }
  throw e;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const body = (await req.json()) as Body;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, entityType, entityId, registration } = body;
    if (!entityType || !entityId) return fail("entityType and entityId required", 400);

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const liveVerification = !!keySecret;

    // Fail closed: in production a missing gateway secret must NOT accept payments unsigned.
    if (!liveVerification && process.env.NODE_ENV === "production") {
      return fail("Payment verification unavailable", 503);
    }
    if (liveVerification) {
      const expected = crypto.createHmac("sha256", keySecret!)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
      if (expected !== razorpay_signature) return fail("Invalid payment signature", 400);

      // Reject replays of an already-recorded gateway payment (DB @unique is the
      // authoritative guard; this returns a clean 409 for the common case).
      if (razorpay_payment_id) {
        const seen = await prisma.payment.findFirst({ where: { razorpayPaymentId: razorpay_payment_id }, select: { id: true } });
        if (seen) return fail("This payment has already been processed", 409);
      }
    }

    // Bind the order to (user, entity): a signed order/payment for one entity can't
    // be redeemed against another. Fail closed under live verification — a real order
    // was persisted at create-order time, so a missing ledger row is rejected.
    const orderRec = await prisma.paymentOrder.findUnique({ where: { razorpayOrderId: razorpay_order_id } });
    if (liveVerification || orderRec) {
      const bind = assertOrderBinding(orderRec, { userId: session.id, entityType, entityId });
      if (!bind.ok) return fail(bind.message, bind.status);
    }

    if (entityType === "coach") {
      const { batchId, phone, note } = registration ?? {};
      const coach = await prisma.coach.findUnique({
        where: { id: entityId },
        select: { id: true, priceMin: true, priceMax: true, seatsLeft: true, status: true, name: true, address: true, phone: true },
      });
      if (!coach) return fail("Coach not found", 404);
      const coachRefusal = coachAdmission(coach);
      if (coachRefusal) return fail(coachRefusal.message, coachRefusal.status);

      let chargePaise: number;
      try { chargePaise = coachChargePaise(coach); }
      catch { return fail("This coach is not available for instant pay", 400); }
      if (orderRec && orderRec.amount !== chargePaise) return fail("Order amount changed, please retry", 409);

      const cleanedPhone = typeof phone === "string" ? phone.trim() : "";
      if (cleanedPhone && !/^\+?[\d\s-]{7,20}$/.test(cleanedPhone)) {
        return fail("Please enter a valid mobile number", 400);
      }

      try {
        const booking = await prisma.$transaction(async (tx) => {
          if (cleanedPhone) {
            await tx.user.update({ where: { id: session.id }, data: { phone: cleanedPhone } });
          }
          // Conditional seat claim — 0 rows means someone else took the last seat.
          const claim = await tx.coach.updateMany({ where: { id: entityId, seatsLeft: { gt: 0 } }, data: { seatsLeft: { decrement: 1 } } });
          if (claim.count === 0) throw new ApiError("No seats available", 409);
          if (batchId) {
            const batch = await tx.batch.findUnique({ where: { id: batchId }, select: { seats: true, coachId: true } });
            if (batch && batch.coachId === entityId && batch.seats > 0) {
              await tx.batch.update({ where: { id: batchId }, data: { seats: { decrement: 1 } } });
            }
          }
          const created = await tx.booking.create({
            data: {
              userId: session.id, coachId: entityId, batchId: batchId ?? null,
              status: "approved", approvedAt: new Date(), note: note ?? null,
              paymentStatus: "paid", amountPaid: chargePaise,
            },
          });
          await tx.payment.create({
            data: {
              // entityId is the PURCHASED entity everywhere else (campId, gameId, …)
              // and PaymentOrder already stores the coachId here. Storing the booking
              // id instead made @@index([entityType, entityId]) unusable for
              // "all payments for coach X" — admin coach revenue read back zero.
              // The booking is kept as its own column so refunds can still find it.
              userId: session.id, entityType, entityId, bookingId: created.id,
              razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id,
              amount: chargePaise, currency: "INR",
              status: "paid" satisfies PaymentStatus, paidAt: new Date(),
            },
          });
          return created;
        });
        // A paid coach booking skips "pending" entirely — it is approved the moment
        // the money lands, so the player never sees an approval email. bookingConfirmed
        // was written for exactly this and sent by nothing. Emitted after commit.
        try {
          const batchRow = batchId
            ? await prisma.batch.findUnique({ where: { id: batchId }, select: { day: true, time: true } })
            : null;
          logOpsSafe(() => ({
            type: "booking.confirmed",
            title: `[GG] Coach session paid & confirmed — ${coach.name}`,
            body: `${session.name ?? "A player"} paid for ${coach.name}.`,
            link: "/admin/bookings/coaches",
            entityType: "coach", entityId, userId: session.id,
            dedupeKey: `booking.confirmed:${booking.id}`,
            meta: {
              playerName: session.name ?? "there",
              coachName: coach.name,
              batch: batchRow ? `${batchRow.day} ${batchRow.time}` : "1:1 session",
              address: coach.address ?? "",
              phone: coach.phone ?? "",
            },
          }));
        } catch (err) { logger.error("booking.confirmed alert failed", { err }); }

        return ok({ verified: true, bookingId: booking.id });
      } catch (e) { return txError(e); }
    }

    if (entityType === "camp") {
      const { childName, childAge } = registration ?? {};
      if (!childName || !childAge) return fail("childName and childAge are required", 400);

      const camp = await prisma.camp.findUnique({ where: { id: entityId }, select: { participants: true, maxParticipants: true, price: true, status: true, registrationDeadline: true } });
      if (!camp) return fail("Camp not found", 404);
      const campRefusal = campAdmission(camp, new Date());
      if (campRefusal) return fail(campRefusal.message, campRefusal.status);

      let chargePaise: number;
      try { chargePaise = campChargePaise(camp); } catch (e) { return fail(e instanceof NotPayableError ? e.message : "Invalid camp", 400); }
      if (orderRec && orderRec.amount !== chargePaise) return fail("Order amount changed, please retry", 409);

      try {
        await prisma.$transaction(async (tx) => {
          const claim = await tx.camp.updateMany({
            where: { id: entityId, participants: { lt: camp.maxParticipants }, status: { notIn: ["closed", "completed", "archived"] } },
            data: { participants: { increment: 1 } },
          });
          if (claim.count === 0) throw new ApiError("Camp is full", 409);
          await tx.camp.updateMany({ where: { id: entityId, participants: { gte: camp.maxParticipants } }, data: { status: "full" } });
          await tx.payment.create({
            data: {
              userId: session.id, entityType, entityId,
              razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id,
              amount: chargePaise, currency: "INR",
              status: "paid" satisfies PaymentStatus, paidAt: new Date(),
            },
          });
          // Cancelling a PAID registration keeps the row (it carries the refund
          // owed — src/lib/refunds.ts) and with it @@unique([campId, userId]).
          // Creating over it raised P2002 and this route answered 409 — AFTER
          // Razorpay captured. Revive instead. The old Payment keeps its
          // refund_pending status, so the earlier debt is not erased.
          const revived = await tx.campRegistration.updateMany({
            where: { campId: entityId, userId: session.id, status: "cancelled" },
            data: { status: "registered", cancelledAt: null, childName, childAge: parseInt(String(childAge)), paymentStatus: "paid" satisfies PaymentStatus },
          });
          if (!revived.count) {
            await tx.campRegistration.create({
              data: { campId: entityId, userId: session.id, childName, childAge: parseInt(String(childAge)), paymentStatus: "paid" satisfies PaymentStatus },
            });
          }
        });
      } catch (e) { return txError(e); }
      return ok({ verified: true });
    }

    if (entityType === "event") {
      const { teamName } = registration ?? {};
      const event = await prisma.sportEvent.findUnique({ where: { id: entityId }, select: { participants: true, maxParticipants: true, registrationDeadline: true, approvalMode: true, entryFeeAmount: true, gstPercent: true, convenienceFeePct: true, currency: true, status: true, published: true } });
      if (!event) return fail("Event not found", 404);
      const eventRefusal = eventAdmission(event, new Date());
      if (eventRefusal) return fail(eventRefusal.message, eventRefusal.status);

      let chargePaise: number;
      try { chargePaise = eventChargePaise(event); } catch (e) { return fail(e instanceof NotPayableError ? e.message : "Invalid event", 400); }
      if (orderRec && orderRec.amount !== chargePaise) return fail("Order amount changed, please retry", 409);
      const regStatus = event.approvalMode === "manual" ? "pending" : "approved";

      try {
        await prisma.$transaction(async (tx) => {
          const claim = await tx.sportEvent.updateMany({
            where: { id: entityId, participants: { lt: event.maxParticipants } },
            data: { participants: { increment: 1 } },
          });
          if (claim.count === 0) throw new ApiError("Event is full", 409);
          await tx.sportEvent.updateMany({ where: { id: entityId, participants: { gte: event.maxParticipants } }, data: { status: "Full" } });
          await tx.payment.create({
            data: {
              userId: session.id, entityType, entityId,
              razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id,
              amount: chargePaise, currency: event.currency || "INR",
              status: "paid" satisfies PaymentStatus, paidAt: new Date(),
            },
          });
          // Same revive as camps — see the camp branch above. rejectedAt /
          // rejectionReason are cleared too, or a re-registration would show the
          // previous run's rejection on the user's profile.
          const revived = await tx.eventRegistration.updateMany({
            where: { eventId: entityId, userId: session.id, status: "cancelled" },
            data: { status: regStatus, cancelledAt: null, approvedAt: null, rejectedAt: null, rejectionReason: null, teamName, paymentStatus: "paid" satisfies PaymentStatus },
          });
          if (!revived.count) {
            await tx.eventRegistration.create({ data: { eventId: entityId, userId: session.id, teamName, paymentStatus: "paid" satisfies PaymentStatus, status: regStatus } });
          }
        });
      } catch (e) { return txError(e); }
      return ok({ verified: true });
    }

    // "game" is intentionally absent. Player-hosted games are paid host-to-player
    // outside Game Ground, so a game can never reach a verified-payment join —
    // it falls through to the unsupported-entityType rejection below. Joining is
    // done through POST /api/games/:id, which no longer gates on price.

    if (entityType === "workshop") {
      const { participantName, participantAge, registrationType } = registration ?? {};
      if (!participantName) return fail("participantName is required", 400);
      if (!registrationType) return fail("registrationType is required", 400);

      const workshop = await prisma.workshop.findUnique({ where: { id: entityId }, select: { participants: true, maxParticipants: true, registrationDeadline: true, status: true, price: true } });
      if (!workshop) return fail("Workshop not found", 404);
      const workshopRefusal = workshopAdmission(workshop, new Date());
      if (workshopRefusal) return fail(workshopRefusal.message, workshopRefusal.status);

      let chargePaise: number;
      try { chargePaise = workshopChargePaise(workshop); } catch (e) { return fail(e instanceof NotPayableError ? e.message : "Invalid workshop", 400); }
      if (orderRec && orderRec.amount !== chargePaise) return fail("Order amount changed, please retry", 409);

      try {
        await prisma.$transaction(async (tx) => {
          const claim = await tx.workshop.updateMany({
            where: { id: entityId, participants: { lt: workshop.maxParticipants }, status: { notIn: ["closed", "completed", "archived"] } },
            data: { participants: { increment: 1 } },
          });
          if (claim.count === 0) throw new ApiError("Workshop is full", 409);
          await tx.workshop.updateMany({ where: { id: entityId, participants: { gte: workshop.maxParticipants } }, data: { status: "full" } });
          await tx.payment.create({
            data: {
              userId: session.id, entityType, entityId,
              razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id,
              amount: chargePaise, currency: "INR",
              status: "paid" satisfies PaymentStatus, paidAt: new Date(),
            },
          });
          // Same revive as camps — see the camp branch above.
          const revived = await tx.workshopRegistration.updateMany({
            where: { workshopId: entityId, userId: session.id, status: "cancelled" },
            data: {
              status: "registered", cancelledAt: null,
              participantName, participantAge: participantAge ? parseInt(String(participantAge)) : null,
              registrationType, paymentStatus: "paid" satisfies PaymentStatus,
            },
          });
          if (!revived.count) {
            await tx.workshopRegistration.create({
              data: {
                workshopId: entityId, userId: session.id,
                participantName, participantAge: participantAge ? parseInt(String(participantAge)) : null,
                registrationType, paymentStatus: "paid" satisfies PaymentStatus,
              },
            });
          }
        });
      } catch (e) { return txError(e); }
      return ok({ verified: true });
    }

    return fail("Unsupported entityType", 400);
  } catch (e) { return handleErr(e); }
}
