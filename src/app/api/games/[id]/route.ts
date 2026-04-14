import { NextRequest } from "next/server";
import { getDB, saveDB, uid } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const db = getDB();
    const game = db.games.find(g => g.id === id);
    if (!game) return fail("Game not found", 404);

    const org = db.users.find(u => u.id === game.organizerId);
    const players = db.gamePlayers
      .filter(gp => gp.gameId === id)
      .map(gp => {
        const u = db.users.find(u => u.id === gp.userId);
        return { id: gp.id, userId: gp.userId, name: u?.name ?? "Unknown", username: u?.username ?? "", avatarUrl: u?.avatarUrl, rating: u?.reliabilityScore ?? 4.5, joinedAt: gp.joinedAt };
      });

    return ok({
      ...game,
      organizerName: org?.name, organizerRating: org?.reliabilityScore,
      organizerGames: org?.gamesOrganized, organizerAvatar: org?.avatarUrl,
      players,
    });
  } catch (e) { return handleErr(e); }
}

// JOIN
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const db = getDB();
    const game = db.games.find(g => g.id === id);
    if (!game) return fail("Game not found", 404);
    if (game.organizerId === session.id) return fail("You cannot join your own game", 400);

    const alreadyIn = db.gamePlayers.find(gp => gp.gameId === id && gp.userId === session.id);
    if (alreadyIn) return fail("Already joined this game", 409);

    // Waitlist if full
    if (game.slotsLeft <= 0 || game.status === "full") {
      const onWaitlist = db.waitlist.find(w => w.gameId === id && w.userId === session.id);
      if (onWaitlist) return fail("Already on waitlist", 409);
      const position = db.waitlist.filter(w => w.gameId === id).length + 1;
      db.waitlist.push({ id: uid("w_"), gameId: id, userId: session.id, position, createdAt: new Date().toISOString() });
      saveDB(db);
      return ok({ waitlisted: true, position });
    }

    db.gamePlayers.push({ id: uid("gp_"), gameId: id, userId: session.id, joinedAt: new Date().toISOString() });
    game.slotsLeft--;
    if (game.slotsLeft === 0) game.status = "full";
    const user = db.users.find(u => u.id === session.id);
    if (user) user.gamesPlayed++;
    saveDB(db);

    return ok({ joined: true, slotsLeft: game.slotsLeft, status: game.status });
  } catch (e) { return handleErr(e); }
}

// LEAVE
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const db = getDB();
    const idx = db.gamePlayers.findIndex(gp => gp.gameId === id && gp.userId === session.id);
    if (idx === -1) return fail("Not in this game", 400);

    db.gamePlayers.splice(idx, 1);
    const game = db.games.find(g => g.id === id);
    if (game) { game.slotsLeft++; if (game.status === "full") game.status = "open"; }
    saveDB(db);

    return ok({ left: true });
  } catch (e) { return handleErr(e); }
}
