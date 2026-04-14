import { NextRequest } from "next/server";
import { getDB, saveDB } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const { attendance } = await req.json(); // { userId: boolean }
    const db   = getDB();
    const game = db.games.find(g => g.id === id);
    if (!game) return fail("Game not found", 404);
    if (game.organizerId !== session.id) return fail("Only the organiser can complete a game", 403);
    if (game.status === "completed") return fail("Game already completed", 400);

    game.status = "completed";
    game.attendanceRecorded = true;

    // Update attendance and reliability for each player
    if (attendance && typeof attendance === "object") {
      for (const [userId, attended] of Object.entries(attendance)) {
        const gp = db.gamePlayers.find(gp => gp.gameId === id && gp.userId === userId);
        if (gp) gp.attended = attended as boolean;

        const user = db.users.find(u => u.id === userId);
        if (user && attended) user.gamesPlayed++;

        // Recalculate attendance rate
        if (user) {
          const allGPs = db.gamePlayers.filter(gp => gp.userId === userId && gp.attended !== undefined);
          const attendedCount = allGPs.filter(gp => gp.attended).length;
          user.attendanceRate = allGPs.length > 0 ? Math.round((attendedCount / allGPs.length) * 100) : 100;
          // Recalculate reliability: 60% attendance + 40% review avg
          const userReviews   = db.reviews.filter(r => r.coachId === userId);
          const reviewAvg     = userReviews.length ? userReviews.reduce((a, r) => a + r.rating, 0) / userReviews.length : 4.5;
          user.reliabilityScore = Math.round(((user.attendanceRate / 100) * 0.6 + (reviewAvg / 5) * 0.4) * 5 * 10) / 10;
        }
      }
    }
    saveDB(db);
    return ok({ completed: true });
  } catch (e) { return handleErr(e); }
}
