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

    const db   = getDB();
    const game = db.games.find(g => g.id === id);
    if (!game) return fail("Game not found", 404);
    if (game.organizerId !== session.id) return fail("Only the organiser can cancel", 403);
    if (game.status === "completed") return fail("Cannot cancel a completed game", 400);

    game.status = "cancelled";
    saveDB(db);
    return ok({ cancelled: true });
  } catch (e) { return handleErr(e); }
}
