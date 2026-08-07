import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";
import { refundPolicy } from "@/lib/refundPolicy";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const coach = await prisma.coach.findUnique({
      where: { id },
      include: {
        batches: true,
        reviews: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!coach) return fail("Coach not found", 404);

    let userBooking: { id: string; status: string } | null = null;
    const session = await getSessionFromRequest(req);
    if (session) {
      const booking = await prisma.booking.findFirst({
        where: { coachId: id, userId: session.id, status: { notIn: ["cancelled"] } },
        select: { id: true, status: true },
        orderBy: { createdAt: "desc" },
      });
      if (booking) userBooking = booking;
    }

    return ok({
      ...coach,
      userBooking,
      // Instant-pay coaching is sold by Game Ground, so the merchant terms apply.
      refundPolicy: refundPolicy("coach", coach.priceMin),
    });
  } catch (e) { return handleErr(e); }
}
