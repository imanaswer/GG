import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import { isUniqueViolation, toSessionUser, uniqueUsername, USER_SELECT } from "@/lib/socialAuth";

// ─── Config ─────────────────────────────────────────────────────────────────
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
// Google still stamps both spellings depending on the client; accept either.
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export const STATE_COOKIE = "gg_oauth_state";

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Absolute callback URL, derived from NEXT_PUBLIC_APP_URL (falls back to the request origin). */
export function callbackUrl(origin: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || origin;
  return `${base}/api/auth/google/callback`;
}

/** Build the Google consent-screen URL the user is redirected to. */
export function buildAuthUrl(state: string, origin: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: callbackUrl(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    access_type: "online",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

// ─── Profile fetch ────────────────────────────────────────────────────────────
export type GoogleProfile = {
  sub: string;          // stable Google user id → googleId
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
};

/** Exchange the auth code for tokens, then fetch the verified user profile. */
export async function fetchGoogleProfile(code: string, origin: string): Promise<GoogleProfile> {
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: callbackUrl(origin),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) throw new Error("Google token exchange failed");
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) throw new Error("Google did not return an access token");

  const infoRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!infoRes.ok) throw new Error("Failed to fetch Google profile");
  const info = (await infoRes.json()) as {
    sub: string; email?: string; email_verified?: boolean; name?: string; picture?: string;
  };
  if (!info.email) throw new Error("Google account has no email");

  return {
    sub: info.sub,
    email: info.email.toLowerCase(),
    emailVerified: info.email_verified === true,
    name: info.name || info.email.split("@")[0],
    picture: info.picture,
  };
}

// ─── Native (mobile) ID-token verification ───────────────────────────────────
/**
 * The native app can't use the redirect flow, so it runs the OAuth handshake itself and posts the
 * resulting `id_token` here (GameGround Mobile Developer PRD §5.2). Trust in that token comes
 * entirely from this verification: signature against Google's JWKS, issuer, and — the part that
 * matters — an `aud` restricted to OUR OAuth clients. Without the audience pin, an id_token minted
 * for any other Google app would log its bearer in as the matching GameGround user.
 *
 * The audience is the *platform* client id: iOS builds present GOOGLE_IOS_CLIENT_ID, Android
 * GOOGLE_ANDROID_CLIENT_ID. The web client is included because the app also passes it as
 * `webClientId`, and because the Expo web target authenticates against it.
 */
export function mobileGoogleAudiences(): string[] {
  return [
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_CLIENT_ID,
  ].filter((id): id is string => Boolean(id));
}

export function googleMobileConfigured(): boolean {
  return mobileGoogleAudiences().length > 0;
}

// Cached across requests: the key set is remote and rotates, and createRemoteJWKSet handles the
// refresh itself. Built lazily so `next build` never reaches for the network.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
const googleJwks = () => (jwks ??= createRemoteJWKSet(new URL(GOOGLE_JWKS_URL)));

/** Verify a native-app Google id_token and project it onto the same shape the web flow produces. */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const { payload } = await jwtVerify(idToken, googleJwks(), {
    issuer: GOOGLE_ISSUERS,
    audience: mobileGoogleAudiences(),
  });

  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
  if (!payload.sub) throw new Error("Google id_token has no subject");
  if (!email) throw new Error("Google id_token has no email");

  return {
    sub: payload.sub,
    email,
    // Google sends this as a real boolean on id_tokens; the string form appears on some legacy
    // clients. Anything else must read as unverified — this flag gates email auto-linking.
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    name: typeof payload.name === "string" && payload.name ? payload.name : email.split("@")[0],
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
  };
}

// ─── Resolve / create the user ──────────────────────────────────────────────────
const SELECT = USER_SELECT;

/**
 * Resolve a Google profile to an app user, following the lookup order:
 *   1. by googleId  →  log in
 *   2. by email     →  link googleId, then log in
 *   3. else         →  create a new user
 * P2002 unique-violation races during create fall back to a re-lookup-and-link.
 */
export async function resolveGoogleUser(profile: GoogleProfile): Promise<SessionUser> {
  // 1. Existing Google identity.
  const byGoogle = await prisma.user.findUnique({ where: { googleId: profile.sub }, select: SELECT });
  if (byGoogle) return toSessionUser(byGoogle);

  // 2. Existing email account → link.
  const byEmail = await prisma.user.findUnique({ where: { email: profile.email }, select: { ...SELECT, googleId: true } });
  if (byEmail) {
    const linked = await prisma.user.update({
      where: { id: byEmail.id },
      data: {
        googleId: byEmail.googleId ?? profile.sub,
        avatarUrl: byEmail.avatarUrl ?? profile.picture ?? null,
      },
      select: SELECT,
    });
    return toSessionUser(linked);
  }

  // 3. Create a brand-new user.
  try {
    const created = await prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        username: await uniqueUsername(profile.email),
        passwordHash: null,
        googleId: profile.sub,
        avatarUrl: profile.picture ?? null,
        role: "player",
      },
      select: SELECT,
    });
    return toSessionUser(created);
  } catch (e) {
    // P2002: a concurrent callback already created the row. Re-resolve and link.
    if (isUniqueViolation(e)) {
      const raced =
        (await prisma.user.findUnique({ where: { googleId: profile.sub }, select: SELECT })) ??
        (await prisma.user.findUnique({ where: { email: profile.email }, select: SELECT }));
      if (raced) return toSessionUser(raced);
    }
    throw e;
  }
}
