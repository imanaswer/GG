import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { isUniqueViolation, toSessionUser, uniqueUsername, USER_SELECT } from "@/lib/socialAuth";

/**
 * Sign in with Apple — native only (GameGround Mobile Developer PRD §5.2).
 *
 * There is no web counterpart: Apple requires this button on any iOS app that offers third-party
 * sign-in, which is why it exists at all. The app runs the native handshake via
 * `expo-apple-authentication` and posts the resulting `identityToken` here.
 */

const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";
const APPLE_ISSUER = "https://appleid.apple.com";

/**
 * For the *native* flow the identity token's `aud` is the app's bundle identifier — not an OAuth
 * client id. The mobile app ships three bundle ids (dev / preview / production), so this is a
 * comma-separated list, e.g.
 *   APPLE_BUNDLE_IDS=net.gameground.redesigned,net.gameground.redesigned.dev
 * Unset means Apple sign-in is off, and the route answers 503 rather than trusting an unpinned
 * audience — a token minted for any other app would otherwise be accepted.
 */
export function appleAudiences(): string[] {
  return (process.env.APPLE_BUNDLE_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function appleConfigured(): boolean {
  return appleAudiences().length > 0;
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
const appleJwks = () => (jwks ??= createRemoteJWKSet(new URL(APPLE_JWKS_URL)));

export type AppleProfile = {
  sub: string; // stable per-developer-team Apple user id → appleId
  email: string | null; // absent when the user revoked email sharing after first authorization
  emailVerified: boolean;
  isPrivateEmail: boolean; // @privaterelay.appleid.com — real, deliverable, but app-specific
};

/** Apple sends these claims as booleans on some tokens and as the strings "true"/"false" on others. */
function claimBool(value: unknown): boolean {
  return value === true || value === "true";
}

export async function verifyAppleIdentityToken(identityToken: string): Promise<AppleProfile> {
  const { payload } = await jwtVerify(identityToken, appleJwks(), {
    issuer: APPLE_ISSUER,
    audience: appleAudiences(),
  });

  if (!payload.sub) throw new Error("Apple identity token has no subject");

  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
  return {
    sub: payload.sub,
    email,
    emailVerified: claimBool(payload.email_verified),
    isPrivateEmail: claimBool(payload.is_private_email),
  };
}

/**
 * Resolve an Apple profile to an app user, mirroring resolveGoogleUser's lookup order:
 *   1. by appleId → log in
 *   2. by email   → link appleId, then log in
 *   3. else       → create
 *
 * `fullName` comes from the *client*, not the token: Apple releases the user's name only on the
 * very first authorization and never again, so it has to be persisted on the spot or it is lost
 * forever. It is used for display only — never for lookup — because it is unverified input.
 */
export async function resolveAppleUser(
  profile: AppleProfile,
  fullName?: string | null,
): Promise<SessionUser> {
  // 1. Existing Apple identity. Checked before email so a user who later hid their address (or
  //    switched to the private relay) still lands on the same account.
  //    findFirst rather than findUnique so the deletedAt guard can ride along: a
  //    soft-deleted row keeps its columns, and without this a deleted account is
  //    signed straight back in. Deletion also nulls appleId (users/[id] DELETE);
  //    this is the second lock on the same door.
  const byApple = await prisma.user.findFirst({
    where: { appleId: profile.sub, deletedAt: null },
    select: USER_SELECT,
  });
  if (byApple) return toSessionUser(byApple);

  // Past this point we need an address: it is the account's identity column and cannot be null.
  // Apple omits `email` on repeat authorizations if the user revoked sharing — but that only
  // happens for a user we would have matched on appleId above, so reaching here without an email
  // means a genuinely new account we cannot create.
  if (!profile.email) {
    throw new ApiError("Apple did not share an email for this account — sign in with email instead.", 401);
  }

  // 2. Existing email account → link. Apple verifies the address before it ever reaches us, so
  //    this is the same trust hinge as Google's emailVerified check.
  if (!profile.emailVerified) {
    throw new ApiError("This Apple account's email is not verified.", 401);
  }

  const byEmail = await prisma.user.findFirst({
    where: { email: profile.email, deletedAt: null },
    select: { ...USER_SELECT, appleId: true },
  });
  if (byEmail) {
    const linked = await prisma.user.update({
      where: { id: byEmail.id },
      data: { appleId: byEmail.appleId ?? profile.sub },
      select: USER_SELECT,
    });
    return toSessionUser(linked);
  }

  // 3. Create a brand-new user. Apple gives no avatar, so avatarUrl stays null.
  const name = fullName?.trim() || profile.email.split("@")[0];
  try {
    const created = await prisma.user.create({
      data: {
        email: profile.email,
        name: name.slice(0, 60),
        username: await uniqueUsername(profile.email),
        passwordHash: null,
        appleId: profile.sub,
        role: "player",
      },
      select: USER_SELECT,
    });
    return toSessionUser(created);
  } catch (e) {
    // P2002: a concurrent request already created the row. Re-resolve rather than 500.
    if (isUniqueViolation(e)) {
      const raced =
        (await prisma.user.findFirst({ where: { appleId: profile.sub, deletedAt: null }, select: USER_SELECT })) ??
        (await prisma.user.findFirst({ where: { email: profile.email, deletedAt: null }, select: USER_SELECT }));
      if (raced) return toSessionUser(raced);
    }
    throw e;
  }
}
