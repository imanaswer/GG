import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { getDB } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDB();
  const registrations = db.campRegistrations.map(r => {
    const user = db.users.find(u => u.id === r.userId);
    const camp = db.camps.find(c => c.id === r.campId);
    return { ...r, parentName: user?.name, parentEmail: user?.email, parentPhone: user?.phone, campTitle: camp?.title, campSport: camp?.sport };
  }).sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
  return NextResponse.json({ registrations, camps: db.camps });
}
