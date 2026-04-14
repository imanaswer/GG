import { NextRequest } from "next/server";
import { getDB, saveDB, uid } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const db    = getDB();
    const event = db.events.find(e => e.id === id);
    if (!event) return fail("Event not found", 404);
    const now = new Date();
    let status = event.status;
    if (new Date(event.startDate) <= now && new Date(event.endDate) >= now) status = "Live";
    const regs = db.eventRegistrations.filter(r => r.eventId === id);
    return ok({ ...event, status, registeredCount: regs.length, registrations: regs });
  } catch (e) { return handleErr(e); }
}
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);
    const { teamName } = await req.json().catch(() => ({}));
    const db    = getDB();
    const event = db.events.find(e => e.id === id);
    if (!event) return fail("Event not found", 404);
    if (event.participants >= event.maxParticipants) return fail("Event is full", 400);
    if (new Date(event.registrationDeadline) < new Date()) return fail("Registration deadline has passed", 400);
    if (db.eventRegistrations.find(r => r.eventId === id && r.userId === session.id)) return fail("Already registered", 409);
    db.eventRegistrations.push({ id: uid("er_"), eventId: id, userId: session.id, teamName, registeredAt: new Date().toISOString() });
    event.participants++;
    if (event.participants >= event.maxParticipants) event.status = "Full";
    saveDB(db);
    return ok({ registered: true, participants: event.participants });
  } catch (e) { return handleErr(e); }
}
