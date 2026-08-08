import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr, ApiError } from "@/lib/api";
import { flagRefundDue } from "@/lib/refunds";
import { refundPolicy } from "@/lib/refundPolicy";
import type { PaymentStatus } from "@/lib/paymentStatus";
import { recordActivityAndRecompute } from "@/lib/reputationService";
import { withinCancelCutoff, CANCEL_CUTOFF_MESSAGE } from "@/lib/gameTime";
import { logOpsSafe } from "@/lib/ops";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const camp = await prisma.camp.findUnique({
      where: { id },
      include: { registrations: true },
    });
    if (!camp) return fail("Camp not found", 404);

    let userRegistration: { id: string; paymentStatus: string; childName: string; childAge: number } | null = null;
    const session = await getSessionFromRequest(req);
    if (session) {
      const reg = camp.registrations.find(r => r.userId === session.id);
      if (reg) userRegistration = { id: reg.id, paymentStatus: reg.paymentStatus, childName: reg.childName, childAge: reg.childAge };
    }

    return ok({
      ...camp,
      registeredCount: camp.registrations.length,
      userRegistration,
      refundPolicy: refundPolicy("camp", camp.price),
    });
  } catch (e) { return handleErr(e); }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);
    const { childName, childAge } = await req.json();
    if (!childName || !childAge) return fail("childName and childAge are required", 400);

    const camp = await prisma.camp.findUnique({ where: { id }, select: { participants: true, maxParticipants: true, status: true, price: true, registrationDeadline: true, title: true, startDate: true, endDate: true, location: true } });
    if (!camp) return fail("Camp not found", 404);
    // Paid camps must go through the payment/verify flow (which creates the paid
    // registration). This free-register endpoint would otherwise let a user occupy
    // a paid slot without paying.
    if (camp.price > 0) return fail("This camp requires payment to register", 402);
    if (["closed", "completed", "archived"].includes(camp.status)) return fail("Registrations are closed for this camp", 409);
    if (camp.participants >= camp.maxParticipants) return fail("Camp is full", 400);
    // Camps carry a registrationDeadline like workshops and events do, and it was
    // the only entity never checking it — the date was collected and ignored.
    if (camp.registrationDeadline < new Date()) return fail("Registration deadline has passed", 400);

    const existing = await prisma.campRegistration.findFirst({ where: { campId: id, userId: session.id }, select: { id: true } });
    if (existing) return fail("Already registered", 409);

    try {
      await prisma.$transaction(async (tx) => {
        // Conditional claim, not read-then-increment: two users taking the last
        // seat at once both passed the check above and both incremented, putting
        // 11 registrations in a 10-seat camp. This is the pattern every other
        // paid entity already uses.
        const claim = await tx.camp.updateMany({
          where: { id, participants: { lt: camp.maxParticipants }, status: { notIn: ["closed", "completed", "archived"] } },
          data: { participants: { increment: 1 } },
        });
        if (claim.count === 0) throw new ApiError("Camp is full", 409);
        await tx.camp.updateMany({ where: { id, participants: { gte: camp.maxParticipants } }, data: { status: "full" } });
        // Only free camps reach this route (paid ones 402 above), so the schema's
        // "pending" default was permanently awaiting a payment that never exists —
        // and reputationService counts camps on paymentStatus: "paid", so free
        // camps never counted. Events and workshops already stamp this explicitly.
        await tx.campRegistration.create({
          data: { campId: id, userId: session.id, childName, childAge: parseInt(String(childAge)), paymentStatus: "paid" satisfies PaymentStatus },
        });
      });
    } catch (e) {
      if (e instanceof ApiError) return fail(e.message, e.status);
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return fail("Already registered", 409);
      }
      throw e;
    }

    await recordActivityAndRecompute(session.id);

    const after = await prisma.camp.findUnique({ where: { id }, select: { participants: true } });
    // Only FREE registrations reach this route — paid ones go through
    // payments/verify and are announced by payment.captured instead.
    logOpsSafe(() => ({
      type: "registration.created",
      title: "[GG] New camp registration (free)",
      body: `${session.name ?? "A player"} registered.`,
      link: "/admin/bookings/camps",
      entityType: "camp", entityId: id, userId: session.id,
      dedupeKey: `registration.created:camp:${id}:${session.id}`,
      // Feeds emails.campRegistered on the customer channel — see lib/ops.ts.
      meta: {
        entity: "camp",
        parentName: session.name ?? "there",
        childName: String(childName),
        campName: camp.title,
        dates: `${camp.startDate.toLocaleDateString("en-IN")} – ${camp.endDate.toLocaleDateString("en-IN")}`,
        contact: camp.location,
      },
    }));

    return ok({ registered: true, slotsLeft: Math.max(0, camp.maxParticipants - (after?.participants ?? camp.maxParticipants)) });
  } catch (e) { return handleErr(e); }
}

// CANCEL REGISTRATION
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const reg = await prisma.campRegistration.findFirst({
      where: { campId: id, userId: session.id, status: { not: "cancelled" } },
      select: { id: true, paymentStatus: true },
    });
    if (!reg) return fail("Not registered for this camp", 400);

    const camp = await prisma.camp.findUnique({ where: { id }, select: { startDate: true, status: true } });
    if (!camp) return fail("Camp not found", 404);

    if (withinCancelCutoff(camp.startDate, new Date())) return fail(CANCEL_CUTOFF_MESSAGE, 403);

    const refundDue = await prisma.$transaction(async (tx) => {
      // A paid registration is marked cancelled, not deleted. Deleting released
      // the seat and erased the only record that the money was still ours — the
      // seat could be resold while the first registrant's payment sat unreturned.
      const owed = reg.paymentStatus === "paid"
        && await flagRefundDue(tx, { entityType: "camp", entityId: id, userId: session.id });

      if (owed) {
        await tx.campRegistration.update({
          where: { id: reg.id },
          data: { status: "cancelled", cancelledAt: new Date(), paymentStatus: "refund_pending" satisfies PaymentStatus },
        });
      } else {
        await tx.campRegistration.delete({ where: { id: reg.id } });
      }

      await tx.camp.update({
        where: { id },
        data: { participants: { decrement: 1 }, status: camp.status === "full" ? "open" : undefined },
      });
      return owed;
    });

    // Logged AFTER the transaction commits — a duplicate dedupeKey raises P2002,
    // and a P2002 inside a live transaction would poison it and roll back the
    // cancellation. dedupeKey makes a double-cancel a single alert.
    if (refundDue) logOpsSafe(() => ({
      type: "refund.due",
      severity: "action",
      title: `[GG] Refund due — camp cancellation`,
      body: `A paid camp registration was cancelled. The seat is back on sale; the money is not.`,
      link: "/admin/bookings/camps?status=refund_pending",
      entityType: "camp", entityId: id, userId: session.id,
      dedupeKey: `refund.due:camp:${id}:${session.id}`,
    }));

    return ok({ cancelled: true, refundDue });
  } catch (e) { return handleErr(e); }
}
