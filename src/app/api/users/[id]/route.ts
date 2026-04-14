import { NextRequest } from "next/server";
import { getDB, saveDB } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const db   = getDB();
    const user = db.users.find(u => u.id === id);
    if (!user) return fail("User not found", 404);

    const gamesPlayed    = db.gamePlayers.filter(gp => gp.userId === id).length;
    const gamesOrganized = db.games.filter(g => g.organizerId === id).length;
    const bookings       = db.bookings.filter(b => b.userId === id).map(b => {
      const coach = db.coaches.find(c => c.id === b.coachId);
      return { ...b, coachName: coach?.name, sport: coach?.sport, location: coach?.location, imageUrl: coach?.imageUrl };
    });

    const sportMap: Record<string, number> = {};
    for (const gp of db.gamePlayers.filter(g => g.userId === id)) {
      const game = db.games.find(g => g.id === gp.gameId);
      if (game) sportMap[game.sport] = (sportMap[game.sport] ?? 0) + 1;
    }
    const sports = Object.entries(sportMap)
      .sort((a, b) => b[1] - a[1])
      .map(([sport, games]) => ({ sport, games, level: "Intermediate" }));

    const upcomingGames = db.gamePlayers
      .filter(gp => gp.userId === id)
      .map(gp => db.games.find(g => g.id === gp.gameId))
      .filter(g => g && new Date(g.scheduledAt) > new Date() && g.status !== "cancelled") as typeof db.games;

    const achievements = [];
    if (gamesPlayed >= 1)  achievements.push({ icon: "🏃", title: "First Game",   description: "Played your first pickup game" });
    if (gamesPlayed >= 10) achievements.push({ icon: "⭐", title: "Regular",      description: "Joined 10+ games" });
    if (gamesOrganized >= 1) achievements.push({ icon: "🎯", title: "Organiser",  description: "Organised your first game" });
    if (user.attendanceRate >= 95) achievements.push({ icon: "💯", title: "Reliable", description: "95%+ attendance rate" });

    return ok({
      ...user, passwordHash: undefined, passwordResetToken: undefined, passwordResetExpiry: undefined,
      gamesPlayed, gamesOrganized, sports, upcomingGames, bookings, achievements,
    });
  } catch (e) { return handleErr(e); }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session || session.id !== id) return fail("Unauthorized", 403);

    const { name, bio, location, sports, phone, username } = await req.json();
    const db   = getDB();
    const user = db.users.find(u => u.id === id);
    if (!user) return fail("User not found", 404);

    // Username availability check
    if (username && username !== user.username) {
      const taken = db.users.some(u => u.username === username && u.id !== id);
      if (taken) return fail("Username already taken", 409);
      user.username = username;
    }

    if (name)     user.name     = name;
    if (bio !== undefined)      user.bio      = bio;
    if (location !== undefined) user.location = location;
    if (sports)   user.sports   = sports;
    if (phone !== undefined)    user.phone    = phone;
    saveDB(db);

    return ok({ ...user, passwordHash: undefined });
  } catch (e) { return handleErr(e); }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session || session.id !== id) return fail("Unauthorized", 403);

    const db = getDB();
    // Anonymise reviews they wrote (keep text for coaches)
    db.reviews = db.reviews.map(r => r.userId === id ? { ...r, reviewerName: "Deleted User", userId: "deleted" } : r);
    // Remove game participations
    db.gamePlayers = db.gamePlayers.filter(gp => gp.userId !== id);
    // Cancel their bookings
    db.bookings = db.bookings.map(b => b.userId === id ? { ...b, status: "cancelled" as const } : b);
    // Remove user
    db.users = db.users.filter(u => u.id !== id);
    saveDB(db);

    return ok({ deleted: true });
  } catch (e) { return handleErr(e); }
}
