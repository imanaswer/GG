import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.coach.findMany({
    include: {
      bookings: { select: { status: true } },
      reviews:  true,
      batches:  true,
    },
  });
  const payments = await prisma.payment.groupBy({ by: ["entityId"], where: { status: "paid", entityType: "booking" }, _sum: { amount: true } });
  const revenueByEntity = new Map(payments.map(p => [p.entityId, p._sum.amount ?? 0]));

  const coaches = rows.map(c => {
    const bookings = c.bookings;
    return {
      ...c,
      totalBookings: bookings.length,
      confirmedBookings: bookings.filter(b => b.status === "confirmed").length,
      revenue: revenueByEntity.get(c.id) ?? 0,
      reviews: c.reviews,
    };
  });
  return NextResponse.json({ coaches });
}
