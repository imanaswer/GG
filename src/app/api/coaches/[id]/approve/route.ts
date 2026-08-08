import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSessionFromRequest, getAdminActor } from "@/lib/adminAuth";
import { ok, fail, handleErr } from "@/lib/api";
import { logOpsSafe } from "@/lib/ops";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Approve or deactivate a coach.
 *
 * This used to gate on `session.role === "admin"` from the ordinary PLAYER session,
 * which made it the one admin action reachable without the admin password: anyone
 * whose User row carried role "admin" could approve coaches with their normal login
 * cookie, no gg_admin session, and nothing recorded. Now that named admin accounts
 * are real User rows with that exact role, that gap was about to become genuinely
 * reachable. It gates on the admin session like every other admin action, and writes
 * an audit row like every other admin action.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    if (!await getAdminSessionFromRequest(req)) return fail("Admin only", 403);

    const { id } = await params;
    const { action } = await req.json();
    const status = action === "approve" ? "active" : "inactive";
    try {
      await prisma.coach.update({ where: { id }, data: { status } });
    } catch {
      return fail("Coach not found", 404);
    }

    const actor = await getAdminActor(req);
    logOpsSafe(() => ({
      type: "admin.action",
      severity: "audit" as const,
      title: `${actor?.name ?? "Shared login"} ${action === "approve" ? "approved" : "deactivated"} a coach`,
      entityType: "coach",
      entityId: id,
      actorId: actor?.id ?? "shared",
      actorName: actor?.name ?? "Shared login",
      meta: { action: action === "approve" ? "approve" : "deactivate", category: "coaches", status },
    }));

    return ok({ coachId: id, status });
  } catch (e) { return handleErr(e); }
}
