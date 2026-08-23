import { NextRequest } from "next/server";
import { z } from "zod";
import { signToken } from "@/lib/auth";
import { ok, fail, handleErr, ApiError } from "@/lib/api";
import { appleConfigured, resolveAppleUser, verifyAppleIdentityToken } from "@/lib/apple";
import { prisma } from "@/lib/prisma";
import { isNewAccount } from "@/lib/socialAuth";
import { authLimit, clientIp, tooManyRequests } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const Body = z.object({
  identityToken: z.string().min(1),
  // Apple releases the name on the FIRST authorization only, and only to the client — it is never
  // in the token. Nullable because every later sign-in omits it.
  fullName: z.string().max(120).nullish(),
});

/**
 * Sign in with Apple, native only (GameGround Mobile Developer PRD §5.2).
 *
 * Required by App Store review because the app offers Google sign-in. There is no web equivalent
 * and no cookie: the app authenticates with `Authorization: Bearer`.
 */
export async function POST(req: NextRequest) {
  try {
    const rl = await authLimit(clientIp(req));
    if (!rl.success) return tooManyRequests(rl);

    // Unset APPLE_BUNDLE_IDS means no pinned audience. Refusing here is the point: verifying with an
    // empty audience list would accept identity tokens minted for any other developer's app.
    if (!appleConfigured()) return fail("Apple sign-in is not configured.", 503);

    const { identityToken, fullName } = Body.parse(await req.json());

    let profile;
    try {
      profile = await verifyAppleIdentityToken(identityToken);
    } catch (e) {
      logger.error("apple identity token verification failed", { err: e });
      throw new ApiError("Apple sign-in failed. Please try again.", 401);
    }

    const user = await resolveAppleUser(profile, fullName);
    // Same flag the Google exchange returns, from the same rule — see
    // isNewAccount. One extra indexed read on a path that is never hot, in
    // exchange for not threading a second return value through the resolver
    // (and so through the web sign-in path, which has no use for it).
    const row = await prisma.user.findUnique({ where: { id: user.id }, select: { createdAt: true, phone: true } });
    return ok({
      user: { ...user, phone: row?.phone ?? undefined },
      token: await signToken(user),
      isNew: row ? isNewAccount(row.createdAt) : false,
    });
  } catch (e) {
    return handleErr(e);
  }
}
