import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams: p } = new URL(req.url);
  const q      = p.get("q")?.toLowerCase();
  const status = p.get("status");
  const sport  = p.get("sport");

  const rows = await prisma.booking.findMany({
    include: {
      user:  { select: { name: true, email: true, phone: true } },
      coach: { select: { name: true, sport: true, email: true } },
      batch: { select: { day: true, time: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  let bookings = rows.map(b => ({
    id: b.id, userId: b.userId, coachId: b.coachId, batchId: b.batchId,
    status: b.status, note: b.note, coachNote: b.coachNote,
    createdAt: b.createdAt, updatedAt: b.updatedAt,
    playerName: b.user?.name, playerEmail: b.user?.email, playerPhone: b.user?.phone,
    coachName: b.coach?.name, coachSport: b.coach?.sport, coachEmail: b.coach?.email,
    batchInfo: b.batch ? `${b.batch.day} ${b.batch.time}` : "—",
  }));

  if (q)      bookings = bookings.filter(b => b.playerName?.toLowerCase().includes(q) || b.coachName?.toLowerCase().includes(q));
  if (status && status !== "all") bookings = bookings.filter(b => b.status === status);
  if (sport  && sport  !== "all") bookings = bookings.filter(b => b.coachSport === sport);

  return NextResponse.json({ bookings, total: bookings.length });
}

export async function PATCH(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, status } = await req.json();
  try {
    await prisma.booking.update({ where: { id }, data: { status } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
