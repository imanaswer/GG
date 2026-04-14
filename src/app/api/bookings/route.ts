import { NextRequest } from "next/server";
import { getDB, saveDB, uid } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const db = getDB();
    const role = new URL(req.url).searchParams.get("role");

    if (role === "coach") {
      // Coach sees bookings for their own coach record
      const coach = db.coaches.find(c => c.userId === session.id || c.email === session.email);
      if (!coach) return ok({ pending: 0, confirmed: 0, list: [] });
      const coachBookings = db.bookings.filter(b => b.coachId === coach.id).map(b => {
        const user = db.users.find(u => u.id === b.userId);
        return { ...b, playerName: user?.name };
      });
      return ok({ pending: coachBookings.filter(b => b.status === "pending").length, confirmed: coachBookings.filter(b => b.status === "confirmed").length, list: coachBookings });
    }

    // Player sees their own bookings
    const bookings = db.bookings.filter(b => b.userId === session.id).map(b => {
      const coach = db.coaches.find(c => c.id === b.coachId);
      return { ...b, coachName: coach?.name, sport: coach?.sport, location: coach?.location, imageUrl: coach?.imageUrl };
    });
    return ok(bookings);
  } catch (e) { return handleErr(e); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const { coachId, batchId, note } = await req.json();
    const db    = getDB();
    const coach = db.coaches.find(c => c.id === coachId);
    if (!coach) return fail("Coach not found", 404);
    if (coach.seatsLeft <= 0) return fail("No seats available", 400);

    const booking = {
      id: uid("bk_"), userId: session.id, coachId, batchId,
      status: "pending" as const, note,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    db.bookings.push(booking);
    if (batchId) {
      const batch = coach.batches.find(b => b.id === batchId);
      if (batch && batch.seats > 0) { batch.seats--; coach.seatsLeft--; }
    } else {
      coach.seatsLeft--;
    }
    saveDB(db);

    return ok(booking);
  } catch (e) { return handleErr(e); }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const { id, status, coachNote } = await req.json();
    const db = getDB();
    const booking = db.bookings.find(b => b.id === id);
    if (!booking) return fail("Booking not found", 404);

    // Coach can confirm/reject, player can cancel their own
    const coach = db.coaches.find(c => c.id === booking.coachId);
    const isCoach  = coach?.userId === session.id || coach?.email === session.email;
    const isPlayer = booking.userId === session.id;
    if (!isCoach && !isPlayer) return fail("Unauthorized", 403);

    const prev = booking.status;
    booking.status    = status;
    booking.updatedAt = new Date().toISOString();
    if (coachNote) booking.coachNote = coachNote;

    // Restore seat if cancelling
    if (prev !== "cancelled" && status === "cancelled" && coach) {
      coach.seatsLeft++;
      if (booking.batchId) { const b = coach.batches.find(b => b.id === booking.batchId); if (b) b.seats++; }
    }
    saveDB(db);
    return ok(booking);
  } catch (e) { return handleErr(e); }
}
