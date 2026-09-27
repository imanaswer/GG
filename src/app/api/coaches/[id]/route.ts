import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { ok, fail, handleErr } from "@/lib/api";
import { refundPolicy } from "@/lib/refundPolicy";
import { COACH_PUBLIC_SELECT } from "@/lib/coachPublic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const coach = await prisma.coach.findUnique({
      where: { id },
      select: {
        ...COACH_PUBLIC_SELECT,
        userId: true, email: true, phone: true,
        batches: true,
        reviews: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!coach) return fail("Coach not found", 404);

    // The list route filters status "active"; this one never did, so a coach who
    // had only self-registered was fully visible to anyone holding their id — a
    // public profile for someone no human had looked at yet. Booking and payment
    // were already blocked by coachAdmission, so this is visibility, not money.
    //
    // Two exceptions, or the filter breaks legitimate use: the coach must be able
    // to see their own profile while they wait, and an admin must be able to
    // review what they are approving.
    const session = await getSessionFromRequest(req);
    const isOwner = !!coach.userId && coach.userId === session?.id;
    const isAdmin = !!(await getAdminSessionFromRequest(req));
    if (coach.status !== "active" && !isOwner && !isAdmin) return fail("Coach not found", 404);

    let userBooking: { id: string; status: string } | null = null;
    if (session) {
      const booking = await prisma.booking.findFirst({
        where: { coachId: id, userId: session.id, status: { notIn: ["cancelled"] } },
        select: { id: true, status: true },
        orderBy: { createdAt: "desc" },
      });
      if (booking) userBooking = booking;
    }

    // Contact details go to the coach, an admin, or a player with a live
    // booking — not to anonymous visitors, and never `userId`.
    const { email, phone, userId: _userId, ...coachPublic } = coach;
    const canContact = isOwner || isAdmin || !!userBooking;
    return ok({
      ...coachPublic,
      ...(canContact ? { email, phone } : {}),
      userBooking,
      // Instant-pay coaching is sold by Game Ground, so the merchant terms apply.
      refundPolicy: refundPolicy("coach", coach.priceMin),
    });
  } catch (e) { return handleErr(e); }
}
