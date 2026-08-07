import { NextRequest } from "next/server";
import { ok, fail, handleErr } from "@/lib/api";
import { rotateRefreshToken } from "@/lib/refreshToken";
import { refreshLimit, clientIp, tooManyRequests } from "@/lib/ratelimit";

/**
 * Exchange a refresh token for a new access token.
 *
 * Without this, any 401 logged a mobile user straight out and the session hard-
 * expired at 7 days with no way to extend it silently.
 *
 * The refresh token is rotated on every use; presenting one twice revokes the
 * whole family. A 401 here genuinely means "sign in again" — clients should
 * treat it as terminal rather than retrying.
 */
export async function POST(req: NextRequest) {
  try {
    const rl = await refreshLimit(clientIp(req));
    if (!rl.success) return tooManyRequests(rl);

    const body = await req.json().catch(() => ({}));
    const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken : null;
    const deviceId = typeof body?.deviceId === "string" ? body.deviceId : null;
    if (!refreshToken) return fail("refreshToken is required", 400);

    const result = await rotateRefreshToken(refreshToken, deviceId);
    // Every failure is 401: an invalid, expired, replayed and revoked token are
    // all "this session is over, sign in again", and telling them apart would
    // only help someone probing which stolen token is which.
    if (!result.ok) return fail(result.error, 401);

    return ok({ user: result.user, ...result.session });
  } catch (e) { return handleErr(e); }
}
