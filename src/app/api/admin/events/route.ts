import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { getDB } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDB();
  const registrations = db.eventRegistrations.map(r => {
    const user  = db.users.find(u => u.id === r.userId);
    const event = db.events.find(e => e.id === r.eventId);
    return { ...r, playerName: user?.name, playerEmail: user?.email, eventTitle: event?.title, eventType: event?.type, entryFee: event?.entryFeeAmount ?? 0 };
  }).sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
  return NextResponse.json({ registrations, events: db.events });
}
