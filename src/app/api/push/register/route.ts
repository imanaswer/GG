import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

const PLATFORMS = ["ios", "android", "web"];

/**
 * Register this install's push token.
 *
 * Upserts on the token, because the same token can outlive a logout: reassigning
 * it to the current user is what stops the previous account's notifications from
 * arriving on a device someone else is now signed into.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const deviceId = typeof body?.deviceId === "string" ? body.deviceId : null;
    const platform = PLATFORMS.includes(body?.platform) ? body.platform : "unknown";
    if (!token) return fail("token is required", 400);

    const device = await prisma.deviceToken.upsert({
      where: { token },
      create: { token, userId: session.id, deviceId, platform },
      update: { userId: session.id, deviceId, platform, lastSeenAt: new Date() },
      select: { id: true, mutedCategories: true },
    });

    return ok({ registered: true, deviceTokenId: device.id, mutedCategories: device.mutedCategories });
  } catch (e) { return handleErr(e); }
}

/** Unregister — on logout, or when the OS revokes the token. */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const deviceId = typeof body?.deviceId === "string" ? body.deviceId : null;
    if (!token && !deviceId) return fail("token or deviceId is required", 400);

    // Scoped to the caller's own rows — a token string alone must not let one
    // account silence another's device.
    const res = await prisma.deviceToken.deleteMany({
      where: { userId: session.id, ...(token ? { token } : { deviceId }) },
    });

    return ok({ removed: res.count });
  } catch (e) { return handleErr(e); }
}
