import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { getDB } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDB();
  const coaches = db.coaches.map(c => {
    const bookings  = db.bookings.filter(b => b.coachId === c.id);
    const revenue   = db.payments.filter(p => p.entityId === c.id && p.status === "paid").reduce((a, p) => a + p.amount, 0);
    const reviews   = db.reviews.filter(r => r.coachId === c.id);
    return { ...c, totalBookings: bookings.length, confirmedBookings: bookings.filter(b => b.status === "confirmed").length, revenue, reviews };
  });
  return NextResponse.json({ coaches });
}
