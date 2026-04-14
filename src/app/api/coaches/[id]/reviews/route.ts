import { NextRequest } from "next/server";
import { getDB, saveDB, uid } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id: coachId } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const { rating, text } = await req.json();
    if (!rating || rating < 1 || rating > 5) return fail("Rating must be 1–5", 400);
    if (!text || text.trim().length < 10) return fail("Review must be at least 10 characters", 400);
    if (text.trim().length > 500)         return fail("Review must be under 500 characters", 400);

    const db    = getDB();
    const coach = db.coaches.find(c => c.id === coachId);
    if (!coach) return fail("Coach not found", 404);

    // Check player has a confirmed booking with this coach
    const hasBooking = db.bookings.some(b => b.coachId === coachId && b.userId === session.id && b.status === "confirmed");
    if (!hasBooking) return fail("You can only review coaches you've had a confirmed booking with", 403);

    // One review per player per coach
    if (db.reviews.some(r => r.coachId === coachId && r.userId === session.id))
      return fail("You've already submitted a review for this coach", 409);

    const user = db.users.find(u => u.id === session.id);
    db.reviews.push({
      id: uid("rv_"), userId: session.id, coachId,
      rating, text: text.trim(), reviewerName: user?.name ?? "Player",
      createdAt: new Date().toISOString(),
    });

    // Update coach average rating
    const coachReviews = db.reviews.filter(r => r.coachId === coachId);
    coach.rating      = Math.round((coachReviews.reduce((a, r) => a + r.rating, 0) / coachReviews.length) * 10) / 10;
    coach.reviewCount = coachReviews.length;
    saveDB(db);

    return ok({ submitted: true });
  } catch (e) { return handleErr(e); }
}
