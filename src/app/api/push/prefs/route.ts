import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";
import { PUSH_CATEGORIES, isPushCategory } from "@/lib/push";

/** What this account currently receives, per device. */
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const devices = await prisma.deviceToken.findMany({
      where: { userId: session.id },
      select: { id: true, deviceId: true, platform: true, mutedCategories: true, lastSeenAt: true },
      orderBy: { lastSeenAt: "desc" },
    });

    return ok({ categories: PUSH_CATEGORIES, devices });
  } catch (e) { return handleErr(e); }
}

/**
 * Set which categories a device does NOT want.
 *
 * Stored as the muted set rather than the subscribed set, so a category added
 * later is delivered by default instead of being silently off for every device
 * that registered before it existed.
 *
 * Body: { mutedCategories: string[], deviceId?: string }
 * Without deviceId this applies to every device on the account.
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const body = await req.json().catch(() => ({}));
    const raw = body?.mutedCategories;
    if (!Array.isArray(raw)) return fail("mutedCategories must be an array", 400);

    const unknown = raw.filter(c => !isPushCategory(c));
    if (unknown.length > 0) return fail(`Unknown push categories: ${unknown.join(", ")}`, 400);

    const muted = [...new Set(raw as string[])];
    const deviceId = typeof body?.deviceId === "string" ? body.deviceId : null;

    const res = await prisma.deviceToken.updateMany({
      where: { userId: session.id, ...(deviceId ? { deviceId } : {}) },
      data: { mutedCategories: muted },
    });

    return ok({ updated: res.count, mutedCategories: muted });
  } catch (e) { return handleErr(e); }
}
