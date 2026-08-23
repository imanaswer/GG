import { NextRequest } from "next/server";
import { z } from "zod";
import { signToken } from "@/lib/auth";
import { ok, fail, handleErr, ApiError } from "@/lib/api";
import { googleMobileConfigured, resolveGoogleUser, verifyGoogleIdToken } from "@/lib/google";
import { prisma } from "@/lib/prisma";
import { isNewAccount } from "@/lib/socialAuth";
import { authLimit, clientIp, tooManyRequests } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const Body = z.object({ idToken: z.string().min(1) });

/**
 * Native Google sign-in (GameGround Mobile Developer PRD §5.2).
 *
 * The thin mobile counterpart to /api/auth/google → /callback: the app already ran the OAuth
 * handshake, so all that is left is to verify the id_token and hand back a bearer token. Deliberately
 * NOT a cookie flow — the app authenticates with `Authorization: Bearer`.
 *
 * User resolution reuses resolveGoogleUser, so a person who signed up on the web with Google lands
 * on the same account from the phone, and vice versa.
 */
export async function POST(req: NextRequest) {
  try {
    const rl = await authLimit(clientIp(req));
    if (!rl.success) return tooManyRequests(rl);

    if (!googleMobileConfigured()) return fail("Google sign-in is not configured.", 503);

    const { idToken } = Body.parse(await req.json());

    let profile;
    try {
      profile = await verifyGoogleIdToken(idToken);
    } catch (e) {
      // Signature / audience / expiry failures are all "this token is not ours" — one opaque 401,
      // logged server-side. NOT a 500: the client must not retry these.
      logger.error("google mobile id_token verification failed", { err: e });
      throw new ApiError("Google sign-in failed. Please try again.", 401);
    }

    // The hinge that makes auto-linking by email safe — same rule as the web callback.
    if (!profile.emailVerified) {
      throw new ApiError("This Google account's email is not verified.", 401);
    }

    const user = await resolveGoogleUser(profile);
    // Same flag, same rule as the browser-handoff exchange — see isNewAccount.
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
