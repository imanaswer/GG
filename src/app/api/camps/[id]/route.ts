import { NextRequest } from "next/server";
import { getDB, saveDB, uid } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const db   = getDB();
    const camp = db.camps.find(c => c.id === id);
    if (!camp) return fail("Camp not found", 404);
    const registrations = db.campRegistrations.filter(r => r.campId === id);
    return ok({ ...camp, registrations, registeredCount: registrations.length });
  } catch (e) { return handleErr(e); }
}
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);
    const { childName, childAge } = await req.json();
    if (!childName || !childAge) return fail("childName and childAge are required", 400);
    const db   = getDB();
    const camp = db.camps.find(c => c.id === id);
    if (!camp) return fail("Camp not found", 404);
    if (camp.participants >= camp.maxParticipants) return fail("Camp is full", 400);
    if (db.campRegistrations.find(r => r.campId === id && r.userId === session.id)) return fail("Already registered", 409);
    db.campRegistrations.push({ id: uid("cr_"), campId: id, userId: session.id, childName, childAge: parseInt(String(childAge)), registeredAt: new Date().toISOString() });
    camp.participants++;
    if (camp.participants >= camp.maxParticipants) camp.status = "full";
    saveDB(db);
    return ok({ registered: true, slotsLeft: camp.maxParticipants - camp.participants });
  } catch (e) { return handleErr(e); }
}
