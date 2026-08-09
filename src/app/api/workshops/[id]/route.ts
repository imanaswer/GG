import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr, ApiError } from "@/lib/api";
import { Prisma } from "@prisma/client";
import { refundPolicy } from "@/lib/refundPolicy";
import { recordActivityAndRecompute } from "@/lib/reputationService";
import { PaymentStatus } from "@/lib/paymentStatus";
import { flagRefundDue } from "@/lib/refunds";
import { logOpsSafe } from "@/lib/ops";
import { withinCancelCutoff, CANCEL_CUTOFF_MESSAGE } from "@/lib/gameTime";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const workshop = await prisma.workshop.findUnique({
      where: { id },
      include: { registrations: true },
    });
    if (!workshop) return fail("Workshop not found", 404);

    let userRegistration: {
      id: string; paymentStatus: string;
      participantName: string; participantAge: number | null; registrationType: string;
    } | null = null;
    const session = await getSessionFromRequest(req);
    if (session) {
      const reg = workshop.registrations.find(r => r.userId === session.id);
      if (reg) userRegistration = {
        id: reg.id, paymentStatus: reg.paymentStatus,
        participantName: reg.participantName, participantAge: reg.participantAge,
        registrationType: reg.registrationType,
      };
    }

    return ok({
      ...workshop,
      registeredCount: workshop.registrations.length,
      userRegistration,
      refundPolicy: refundPolicy("workshop", workshop.price),
    });
  } catch (e) { return handleErr(e); }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);
    const { participantName, participantAge, registrationType } = await req.json();
    if (!participantName) return fail("participantName is required", 400);
    if (!registrationType) return fail("registrationType is required", 400);
    if (registrationType === "youth" && !participantAge) return fail("participantAge is required for youth registration", 400);

    const workshop = await prisma.workshop.findUnique({
      where: { id },
      select: { participants: true, maxParticipants: true, registrationDeadline: true, price: true, status: true },
    });
    if (!workshop) return fail("Workshop not found", 404);
    // Paid workshops must go through the payment/verify flow (which creates the paid
    // registration). This free-register endpoint would otherwise let a user occupy
    // a paid slot without paying.
    if (workshop.price > 0) return fail("This workshop requires payment to register", 402);
    if (["closed", "completed", "archived"].includes(workshop.status)) return fail("Registrations are closed for this workshop", 409);
    if (workshop.participants >= workshop.maxParticipants) return fail("Workshop is full", 400);
    if (workshop.registrationDeadline < new Date()) return fail("Registration deadline has passed", 400);

    const existing = await prisma.workshopRegistration.findFirst({ where: { workshopId: id, userId: session.id }, select: { id: true } });
    if (existing) return fail("Already registered", 409);

    const isFree = workshop.price === 0;

    try {
      await prisma.$transaction(async (tx) => {
        // Conditional claim, not read-then-increment. The capacity check above and
        // the increment below used to be separate statements, so two users taking
        // the last seat both passed the check and both incremented — the exact
        // overselling bug already fixed for camps. The guard belongs in the WHERE,
        // where the database resolves the race.
        const claim = await tx.workshop.updateMany({
          where: { id, participants: { lt: workshop.maxParticipants }, status: { notIn: ["closed", "completed", "archived"] } },
          data: { participants: { increment: 1 } },
        });
        if (claim.count === 0) throw new ApiError("Workshop is full", 409);
        await tx.workshop.updateMany({ where: { id, participants: { gte: workshop.maxParticipants } }, data: { status: "full" } });
        await tx.workshopRegistration.create({
          data: {
            workshopId: id, userId: session.id,
            participantName, participantAge: participantAge ? parseInt(String(participantAge)) : null,
            registrationType, paymentStatus: (isFree ? "paid" : "pending") satisfies PaymentStatus,
          },
        });
      });
    } catch (e) {
      if (e instanceof ApiError) return fail(e.message, e.status);
      // @@unique([workshopId, userId]) — a double-submit races past the check above.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail("Already registered", 409);
      throw e;
    }

    await recordActivityAndRecompute(session.id);

    // Only FREE registrations reach this route — paid ones go through
    // payments/verify and are announced by payment.captured instead.
    logOpsSafe(() => ({
      type: "registration.created",
      title: "[GG] New workshop registration (free)",
      body: `${session.name ?? "A player"} registered.`,
      link: "/admin/bookings/workshops",
      entityType: "workshop", entityId: id, userId: session.id,
      dedupeKey: `registration.created:workshop:${id}:${session.id}`,
    }));

    const after = await prisma.workshop.findUnique({ where: { id }, select: { participants: true } });
    return ok({ registered: true, participants: after?.participants ?? workshop.participants + 1 });
  } catch (e) { return handleErr(e); }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const reg = await prisma.workshopRegistration.findFirst({
      where: { workshopId: id, userId: session.id, status: { not: "cancelled" } },
      select: { id: true, paymentStatus: true },
    });
    if (!reg) return fail("Not registered for this workshop", 400);

    const workshop = await prisma.workshop.findUnique({ where: { id }, select: { startDate: true, status: true } });
    if (!workshop) return fail("Workshop not found", 404);

    // Was the last route holding its own copy of the 90-minute rule (and its own
    // copy of the message). games, camps and events already read gameTime.
    if (withinCancelCutoff(workshop.startDate, new Date())) return fail(CANCEL_CUTOFF_MESSAGE, 403);

    const refundDue = await prisma.$transaction(async (tx) => {
      // A paid registration is marked cancelled, not deleted — same rule camps and
      // events already follow. Deleting released the seat AND erased the only
      // record that the money was still ours, so the seat could be resold while
      // the first registrant's payment sat unreturned and invisible.
      const owed = reg.paymentStatus === "paid"
        && await flagRefundDue(tx, { entityType: "workshop", entityId: id, userId: session.id });

      if (owed) {
        await tx.workshopRegistration.update({
          where: { id: reg.id },
          data: { status: "cancelled", cancelledAt: new Date(), paymentStatus: "refund_pending" satisfies PaymentStatus },
        });
      } else {
        await tx.workshopRegistration.delete({ where: { id: reg.id } });
      }

      await tx.workshop.update({
        where: { id },
        data: { participants: { decrement: 1 }, status: workshop.status === "full" ? "open" : undefined },
      });
      return owed;
    });

    // Logged AFTER the transaction commits — a duplicate dedupeKey raises P2002,
    // and a P2002 inside a live transaction would poison it and roll back the
    // cancellation. dedupeKey makes a double-cancel a single alert.
    if (refundDue) logOpsSafe(() => ({
      type: "refund.due",
      severity: "action",
      title: `[GG] Refund due — workshop cancellation`,
      body: `A paid workshop registration was cancelled. The seat is back on sale; the money is not.`,
      link: "/admin/bookings/workshops?status=refund_pending",
      entityType: "workshop", entityId: id, userId: session.id,
      dedupeKey: `refund.due:workshop:${id}:${session.id}`,
    }));

    return ok({ cancelled: true, refundDue });
  } catch (e) { return handleErr(e); }
}
