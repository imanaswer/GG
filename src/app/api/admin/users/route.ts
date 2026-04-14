import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { getDB } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams: p } = new URL(req.url);
  const segment = p.get("segment") ?? "all";
  const db = getDB();
  const now = new Date();

  let users = db.users
    .filter(u => u.role !== "admin" && !u.deletedAt)
    .map(u => {
      const bookings  = db.bookings.filter(b => b.userId === u.id).length;
      const games     = db.gamePlayers.filter(gp => gp.userId === u.id).length;
      const camps     = db.campRegistrations.filter(r => r.userId === u.id).length;
      const events    = db.eventRegistrations.filter(r => r.userId === u.id).length;
      const activity  = bookings + games + camps + events;
      return { id: u.id, name: u.name, username: u.username, role: u.role, location: u.location, gamesPlayed: u.gamesPlayed, bookings, reliabilityScore: u.reliabilityScore, attendanceRate: u.attendanceRate, createdAt: u.createdAt, activity, phone: u.phone };
    });

  if (segment === "active")   users = [...users].sort((a, b) => b.activity - a.activity);
  if (segment === "new")      users = users.filter(u => (now.getTime() - new Date(u.createdAt).getTime()) < 7 * 86400000);
  if (segment === "inactive") users = users.filter(u => u.activity === 0);

  return NextResponse.json({ users, total: users.length });
}
