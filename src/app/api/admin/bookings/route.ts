import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { getDB, saveDB } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams: p } = new URL(req.url);
  const q      = p.get("q")?.toLowerCase();
  const status = p.get("status");
  const sport  = p.get("sport");
  const db     = getDB();

  let bookings = db.bookings.map(b => {
    const user  = db.users.find(u => u.id === b.userId);
    const coach = db.coaches.find(c => c.id === b.coachId);
    const batch = coach?.batches.find(bt => bt.id === b.batchId);
    return { ...b, playerName: user?.name, playerEmail: user?.email, playerPhone: user?.phone, coachName: coach?.name, coachSport: coach?.sport, coachEmail: coach?.email, batchInfo: batch ? `${batch.day} ${batch.time}` : "—" };
  });

  if (q)      bookings = bookings.filter(b => b.playerName?.toLowerCase().includes(q) || b.coachName?.toLowerCase().includes(q));
  if (status && status !== "all") bookings = bookings.filter(b => b.status === status);
  if (sport  && sport  !== "all") bookings = bookings.filter(b => b.coachSport === sport);

  return NextResponse.json({ bookings: bookings.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), total: bookings.length });
}

export async function PATCH(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, status } = await req.json();
  const db = getDB();
  const b  = db.bookings.find(b => b.id === id);
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });
  b.status = status; b.updatedAt = new Date().toISOString();
  saveDB(db);
  return NextResponse.json({ ok: true });
}
