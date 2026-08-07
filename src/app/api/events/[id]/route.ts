import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { deriveEventStatus } from "@/lib/events";
import { ok, fail, handleErr } from "@/lib/api";
import { recordActivityAndRecompute } from "@/lib/reputationService";
import { PaymentStatus } from "@/lib/paymentStatus";
import { sortEventUpdates } from "@/lib/eventUpdates";
import { withinCancelCutoff, CANCEL_CUTOFF_MESSAGE } from "@/lib/gameTime";
import { flagRefundDue } from "@/lib/refunds";
import { refundPolicy } from "@/lib/refundPolicy";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const event = await prisma.sportEvent.findUnique({
      where: { id },
      include: { registrations: true, updates: true },
    });
    if (!event) return fail("Event not found", 404);

    const isAdmin = await getAdminSessionFromRequest(req);
    if (!event.published && !isAdmin) return fail("Event not found", 404);

    const now = new Date();
    const status = deriveEventStatus(event, now);

    let userRegistration: { id: string; paymentStatus: string; teamName: string | null; status: string; rejectionReason: string | null } | null = null;
    const session = await getSessionFromRequest(req);
    if (session) {
      const reg = event.registrations.find(r => r.userId === session.id);
      if (reg) userRegistration = { id: reg.id, paymentStatus: reg.paymentStatus, teamName: reg.teamName, status: reg.status, rejectionReason: reg.rejectionReason };
    }

    const { registrations, updates, ...eventPublic } = event;
    return ok({
      ...eventPublic,
      status,
      registeredCount: registrations.length,
      userRegistration,
      refundPolicy: refundPolicy("event", event.entryFeeAmount),
      updates: sortEventUpdates(updates.map(u => ({ id: u.id, title: u.title, body: u.body, pinned: u.pinned, createdAt: u.createdAt.toISOString() }))),
    });
  } catch (e) { return handleErr(e); }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);
    const { teamName } = await req.json().catch(() => ({}));

    const event = await prisma.sportEvent.findUnique({ where: { id }, select: { participants: true, maxParticipants: true, registrationDeadline: true, entryFeeAmount: true, status: true, published: true, approvalMode: true } });
    if (!event) return fail("Event not found", 404);
    // Paid events must go through the payment/verify flow (which creates the paid
    // registration). This free-register endpoint would otherwise let a user occupy
    // a paid slot without paying.
    if (event.entryFeeAmount > 0) return fail("This event requires payment to register", 402);
    if (["Cancelled", "Completed", "Archived", "Full"].includes(event.status)) return fail("Registrations are closed for this event", 409);
    if (!event.published) return fail("Registrations are closed for this event", 409);
    if (event.participants >= event.maxParticipants) return fail("Event is full", 400);
    if (event.registrationDeadline < new Date()) return fail("Registration deadline has passed", 400);

    const existing = await prisma.eventRegistration.findFirst({ where: { eventId: id, userId: session.id }, select: { id: true } });
    if (existing) return fail("Already registered", 409);

    const newCount = event.participants + 1;
    const statusUpdate = newCount >= event.maxParticipants ? "Full" : undefined;
    const isFree = event.entryFeeAmount === 0;

    await prisma.$transaction([
      prisma.eventRegistration.create({ data: { eventId: id, userId: session.id, teamName, paymentStatus: (isFree ? "paid" : "pending") satisfies PaymentStatus, status: event.approvalMode === "manual" ? "pending" : "approved" } }),
      prisma.sportEvent.update({ where: { id }, data: { participants: { increment: 1 }, status: statusUpdate } }),
    ]);

    await recordActivityAndRecompute(session.id);

    return ok({ registered: true, participants: newCount });
  } catch (e) { return handleErr(e); }
}

// CANCEL REGISTRATION
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const reg = await prisma.eventRegistration.findFirst({ where: { eventId: id, userId: session.id, status: { in: ["pending", "approved"] } }, select: { id: true, paymentStatus: true } });
    if (!reg) return fail("Not registered for this event", 400);

    const event = await prisma.sportEvent.findUnique({ where: { id }, select: { startDate: true, status: true } });
    if (!event) return fail("Event not found", 404);

    if (withinCancelCutoff(event.startDate, new Date())) return fail(CANCEL_CUTOFF_MESSAGE, 403);

    const refundDue = await prisma.$transaction(async (tx) => {
      // Paid registrations are marked, not deleted — see src/lib/refunds.ts.
      const owed = reg.paymentStatus === "paid"
        && await flagRefundDue(tx, { entityType: "event", entityId: id, userId: session.id });

      if (owed) {
        await tx.eventRegistration.update({
          where: { id: reg.id },
          data: { status: "cancelled", cancelledAt: new Date(), paymentStatus: "refund_pending" satisfies PaymentStatus },
        });
      } else {
        await tx.eventRegistration.delete({ where: { id: reg.id } });
      }

      await tx.sportEvent.update({
        where: { id },
        data: { participants: { decrement: 1 }, status: event.status === "Full" ? "Registration Open" : undefined },
      });
      return owed;
    });

    return ok({ cancelled: true, refundDue });
  } catch (e) { return handleErr(e); }
}
