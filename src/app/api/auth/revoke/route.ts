import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleErr } from "@/lib/api";
import { getSessionFromRequest, COOKIE } from "@/lib/auth";
import { revokeRefreshTokens } from "@/lib/refreshToken";

/**
 * End a session for real.
 *
 * Logout used to only drop the client's copy of the token. The JWT is stateless,
 * so a token captured from a "logged out" device stayed valid for the rest of its
 * 7-day life. This revokes the refresh tokens behind it, so the session cannot be
 * extended past the short access-token TTL.
 *
 * Body: { deviceId?: string, all?: boolean }
 *   - deviceId  → just that install
 *   - all: true → every device ("sign out everywhere")
 *   - neither   → every device, since a caller who names nothing is logging out
 *                 and the safe reading of an ambiguous logout is the broader one.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const body = await req.json().catch(() => ({}));
    const deviceId = typeof body?.deviceId === "string" ? body.deviceId : null;
    const all = body?.all === true || !deviceId;

    const revoked = await revokeRefreshTokens(session.id, { deviceId, all });

    // Also drop this device's push registration — a signed-out device must stop
    // receiving notifications for the account.
    await prisma.deviceToken.deleteMany({
      where: { userId: session.id, ...(all ? {} : { deviceId }) },
    });

    const res = ok({ revoked });
    // Clear the browser cookie too, so the same endpoint works for both clients.
    res.cookies.set({ name: COOKIE, value: "", path: "/", maxAge: 0 });
    return res;
  } catch (e) { return handleErr(e); }
}
