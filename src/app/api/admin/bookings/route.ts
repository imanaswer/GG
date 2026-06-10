import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import {
  approveBooking,
  rejectBooking,
  completeBooking,
  cancelBooking,
  BookingTransitionError,
  BookingConflictError,
} from "@/lib/bookings";
import { sendEmail, emails } from "@/lib/email";

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

type DecidedBooking = {
  id: string; userId: string; coachId: string; batchId: string | null; rejectionReason: string | null;
};

async function notifyBookingDecision(booking: DecidedBooking, status: string) {
  if (status !== "approved" && status !== "rejected") return;
  const [user, coach, batch] = await Promise.all([
    prisma.user.findUnique({ where: { id: booking.userId }, select: { name: true, email: true } }),
    prisma.coach.findUnique({ where: { id: booking.coachId }, select: { name: true, address: true, phone: true } }),
    booking.batchId
      ? prisma.batch.findUnique({ where: { id: booking.batchId }, select: { day: true, time: true } })
      : Promise.resolve(null),
  ]);
  if (!user?.email) return;
  const slot = batch ? `${batch.day} ${batch.time}` : "your requested session";
  const coachName = coach?.name ?? "your coach";
  const tpl =
    status === "approved"
      ? emails.bookingApproved(user.name, coachName, slot, coach?.address ?? "", coach?.phone ?? "")
      : emails.bookingRejected(user.name, coachName, slot, booking.rejectionReason ?? undefined);
  await sendEmail({ to: user.email, ...tpl });
}

export async function PATCH(req: NextRequest) {
  if (!(await getAdminSessionFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, status, rejectionReason } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing booking id" }, { status: 400 });

  try {
    let updated;
    if (status === "approved") updated = await approveBooking(id);
    else if (status === "rejected") updated = await rejectBooking(id, rejectionReason);
    else if (status === "completed") updated = await completeBooking(id);
    else if (status === "cancelled") updated = await cancelBooking(id);
    else return NextResponse.json({ error: "Invalid status" }, { status: 400 });

    // Best-effort email; never fail the status change on a mail error.
    await notifyBookingDecision(updated, status).catch((e) => console.error("[booking email]", e));

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof BookingTransitionError || e instanceof BookingConflictError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
