import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id: coachId } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const { rating, text } = await req.json();
    if (!rating || rating < 1 || rating > 5) return fail("Rating must be 1–5", 400);
    if (!text || text.trim().length < 10) return fail("Review must be at least 10 characters", 400);
    if (text.trim().length > 500)         return fail("Review must be under 500 characters", 400);

    const coach = await prisma.coach.findUnique({ where: { id: coachId }, select: { id: true } });
    if (!coach) return fail("Coach not found", 404);

    const hasBooking = await prisma.booking.findFirst({
      where: { coachId, userId: session.id, status: "confirmed" },
      select: { id: true },
    });
    if (!hasBooking) return fail("You can only review coaches you've had a confirmed booking with", 403);

    const existing = await prisma.review.findUnique({ where: { userId_coachId: { userId: session.id, coachId } }, select: { id: true } });
    if (existing) return fail("You've already submitted a review for this coach", 409);

    const user = await prisma.user.findUnique({ where: { id: session.id }, select: { name: true } });

    await prisma.$transaction(async tx => {
      await tx.review.create({
        data: {
          userId: session.id, coachId,
          rating: Math.trunc(rating), text: text.trim(),
          reviewerName: user?.name ?? "Player",
        },
      });
      const agg = await tx.review.aggregate({ where: { coachId }, _avg: { rating: true }, _count: true });
      await tx.coach.update({
        where: { id: coachId },
        data: {
          rating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
          reviewCount: agg._count,
        },
      });
    });

    return ok({ submitted: true });
  } catch (e) { return handleErr(e); }
}
