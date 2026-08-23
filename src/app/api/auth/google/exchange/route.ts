import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";
import { redeemCode } from "@/lib/mobileHandoff";
import { authLimit, clientIp, tooManyRequests } from "@/lib/ratelimit";
import { USER_SELECT, toSessionUser, isNewAccount } from "@/lib/socialAuth";

export const runtime = "nodejs";

const Body = z.object({
  code: z.string().min(1).max(256),
  verifier: z.string().min(16).max(256),
});

/**
 * Redeem the one-time code from /api/auth/google/handoff for a bearer token.
 *
 * This is the only step that crosses HTTPS directly between app and server, which is what makes the
 * scheme redirect safe to use: the code was exposed to any app that claims `ggredesign://`, but
 * redeeming it also requires the verifier, which never left the requesting app.
 */
export async function POST(req: NextRequest) {
  try {
    const rl = await authLimit(clientIp(req));
    if (!rl.success) return tooManyRequests(rl);

    const { code, verifier } = Body.parse(await req.json());

    const result = await redeemCode(code, verifier);
    // One opaque message for every failure mode — unknown, expired, replayed, wrong verifier.
    // 401 rather than 400 so the mobile client treats it as a verdict and does not retry.
    if (!result.ok) return fail("This sign-in link is no longer valid. Please try again.", 401);

    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      select: { ...USER_SELECT, deletedAt: true, createdAt: true, phone: true },
    });
    // The code was valid but the account is gone — hard-deleted, or soft-deleted
    // between handoff and exchange, which leaves the row (and so a truthy `user`)
    // in place. Same opaque message either way.
    if (!user || user.deletedAt) return fail("This sign-in link is no longer valid. Please try again.", 401);

    const sessionUser = toSessionUser(user);
    // isNew routes the app to account setup instead of Home. Without it, a
    // first-ever Google user who tapped Login lands on Home and is never
    // offered setup again.
    return ok({
      user: { ...sessionUser, phone: user.phone ?? undefined },
      token: await signToken(sessionUser),
      isNew: isNewAccount(user.createdAt),
    });
  } catch (e) {
    return handleErr(e);
  }
}
