import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

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
      });
      if (booking) userBooking = booking;
    }

    return ok({ ...coach, userBooking });
  } catch (e) { return handleErr(e); }
}
