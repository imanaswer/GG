import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { finalizeGame } from "@/lib/gameFinalize";

type Ctx = { params: Promise<{ id: string }> };

const unauthorized = () => NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const good = (data: unknown) => NextResponse.json({ ok: true, data });

// Admin-only game actions. Admins bypass all host restrictions.
//   action: "cancel"   — terminal cancel (no rewards, ever).
//   action: "complete" — mark completed + optional attendance flags (no rewards).
//   action: "finalize" — grant rewards exactly once for a completed game.
export async function POST(req: NextRequest, { params }: Ctx) {
  if (!await getAdminSessionFromRequest(req)) return unauthorized();
  const { id } = await params;

  let body: { action?: string; attendance?: Record<string, boolean> } = {};
  try { body = await req.json(); } catch { /* empty body allowed */ }
  const action = body.action;
  const attendance = body.attendance;
  const hasAttendance = !!attendance && typeof attendance === "object" && Object.keys(attendance).length > 0;

  const game = await prisma.game.findUnique({ where: { id }, select: { status: true } });
  if (!game) return bad("Game not found", 404);

  if (action === "cancel") {
    if (game.status === "completed" || game.status === "archived") return bad("Cannot cancel a completed game");
    if (game.status === "cancelled") return bad("Game is already cancelled");
    // Release slotId so the venue slot frees up — Game.slotId is @unique, so a
    // cancelled game must let go of it or that future slot is booked forever.
    await prisma.game.update({ where: { id }, data: { status: "cancelled", cancelledAt: new Date(), slotId: null } });
    return good({ cancelled: true });
  }

  if (action === "complete") {
    if (game.status === "cancelled") return bad("Cannot complete a cancelled game");
    if (game.status === "completed" || game.status === "archived") return bad("Game already completed");
    await prisma.game.update({
      where: { id },
      data: { status: "completed", completedAt: new Date(), attendanceRecorded: hasAttendance ? true : undefined },
    });
    if (hasAttendance) {
      for (const [userId, attended] of Object.entries(attendance!)) {
        await prisma.gamePlayer.updateMany({ where: { gameId: id, userId }, data: { attended } });
      }
    }
    return good({ completed: true, pointsAwarded: false });
  }

  if (action === "finalize") {
    // The reward logic itself lives in src/lib/gameFinalize.ts so the nightly
    // auto-finalize cron runs exactly the same code. An admin finalizing by hand
    // supplies attendance; the cron does not.
    const result = await finalizeGame(id, { attendance: hasAttendance ? attendance : undefined });
    if (!result.ok) return bad(result.error, result.status);
    return good({ finalized: true, pointsAwarded: true, adminVerified: true, playersRewarded: result.playersRewarded });
  }

  return bad("Unknown action");
}

// Admin delete — removes the game and all dependent records in one transaction
// so no orphaned rows are left behind.
export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!await getAdminSessionFromRequest(req)) return unauthorized();
  const { id } = await params;

  const game = await prisma.game.findUnique({ where: { id }, select: { id: true } });
  if (!game) return bad("Game not found", 404);

  await prisma.$transaction([
    prisma.waitlistEntry.deleteMany({ where: { gameId: id } }),
    prisma.gamePlayer.deleteMany({ where: { gameId: id } }),
    prisma.game.delete({ where: { id } }),
  ]);

  return good({ deleted: true });
}
