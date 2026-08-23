import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { signToken, type SessionUser } from "@/lib/auth";

// Refresh tokens for non-browser clients.
//
// The web keeps its 7-day httpOnly cookie — a browser session is already bound
// to a cookie jar the user controls. A phone has neither, so before this a 401
// meant "log out", the session hard-expired at 7 days, and logout revoked
// nothing: a token copied off a "logged out" device stayed valid for a week.

/** Mobile access tokens are short so a stolen one expires quickly. */
export const MOBILE_ACCESS_TTL = "30m";
/** Web/cookie sessions are unchanged. */
export const WEB_ACCESS_TTL = "7d";

const REFRESH_TTL_DAYS = 60;

/** A request from the mobile app rather than the website. */
export function isMobileClient(req: Request): boolean {
  return req.headers.get("x-client")?.toLowerCase() === "mobile";
}

// Stored hashed: a database leak must not yield working sessions. SHA-256 rather
// than bcrypt on purpose — the token is 256 bits of CSPRNG output, so there is no
// low-entropy guess to slow down, and refresh is on the hot path.
const hash = (raw: string) => crypto.createHash("sha256").update(raw).digest("hex");
const newSecret = () => crypto.randomBytes(32).toString("base64url");

export type IssuedSession = {
  token: string;
  refreshToken: string;
  expiresIn: number; // access token lifetime, seconds
};

/**
 * Mint an access token plus a fresh refresh token, starting a new family.
 * Called on login, register and social sign-in when the client is mobile.
 */
export async function issueMobileSession(user: SessionUser, deviceId?: string | null): Promise<IssuedSession> {
  const raw = newSecret();
  await prisma.refreshToken.create({
    data: {
      tokenHash: hash(raw),
      userId: user.id,
      familyId: crypto.randomUUID(),
      deviceId: deviceId ?? null,
      expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000),
    },
  });
  return { token: await signToken(user, MOBILE_ACCESS_TTL), refreshToken: raw, expiresIn: 30 * 60 };
}

export type RefreshResult =
  | { ok: true; user: SessionUser & { phone?: string }; session: IssuedSession }
  | { ok: false; error: string };

/**
 * Exchange a refresh token for a new pair, rotating it.
 *
 * Rotation is on EVERY use. A token that has already been rotated and is
 * presented again means two parties hold it — the legitimate client and someone
 * who copied it — and there is no way to tell which is which, so the entire
 * family is revoked and both must log in again. Failing safe beats guessing.
 */
export async function rotateRefreshToken(rawToken: string, deviceId?: string | null): Promise<RefreshResult> {
  const tokenHash = hash(rawToken);

  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, familyId: true, deviceId: true, expiresAt: true, revokedAt: true, rotatedAt: true },
  });
  if (!existing) return { ok: false, error: "Invalid refresh token" };

  if (existing.rotatedAt || existing.revokedAt) {
    // Replay. Burn the family — including whatever the attacker or the real
    // client is currently holding.
    await prisma.refreshToken.updateMany({
      where: { familyId: existing.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: false, error: "Refresh token has already been used" };
  }

  if (existing.expiresAt < new Date()) return { ok: false, error: "Refresh token has expired" };

  const dbUser = await prisma.user.findUnique({ where: { id: existing.userId } });
  if (!dbUser || dbUser.deletedAt) {
    await prisma.refreshToken.updateMany({ where: { familyId: existing.familyId, revokedAt: null }, data: { revokedAt: new Date() } });
    return { ok: false, error: "Account is no longer active" };
  }

  const user: SessionUser = {
    id: dbUser.id, email: dbUser.email, name: dbUser.name, username: dbUser.username,
    role: dbUser.role, avatarUrl: dbUser.avatarUrl ?? undefined,
  };

  const raw = newSecret();
  // Marking the old token rotated and inserting its successor in one transaction
  // keeps a crash from leaving a family with no live token (locking the user out)
  // or two live tokens (defeating replay detection).
  await prisma.$transaction([
    prisma.refreshToken.update({ where: { id: existing.id }, data: { rotatedAt: new Date() } }),
    prisma.refreshToken.create({
      data: {
        tokenHash: hash(raw),
        userId: existing.userId,
        familyId: existing.familyId,
        deviceId: deviceId ?? existing.deviceId,
        expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000),
      },
    }),
  ]);

  return {
    ok: true,
    // Phone travels with the payload, never inside the signed token.
    user: { ...user, phone: dbUser.phone ?? undefined },
    session: { token: await signToken(user, MOBILE_ACCESS_TTL), refreshToken: raw, expiresIn: 30 * 60 },
  };
}

/**
 * Revoke sessions. `all` covers every device; otherwise just the named one.
 * Idempotent — revoking an already-revoked session is a success, because the
 * caller's goal (that token stops working) is satisfied either way.
 */
export async function revokeRefreshTokens(
  userId: string,
  opts: { deviceId?: string | null; all?: boolean } = {},
): Promise<number> {
  const { deviceId, all } = opts;
  const res = await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(all ? {} : deviceId ? { deviceId } : {}),
    },
    data: { revokedAt: new Date() },
  });
  return res.count;
}
