import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";

// ─── Config ─────────────────────────────────────────────────────────────────
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

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

// ─── Username generation ──────────────────────────────────────────────────────
/** Slugify the email local-part to a base username matching the app's rules. */
function baseUsername(email: string): string {
  const local = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
  const trimmed = local.slice(0, 16); // leave room for a numeric suffix (max 20)
  return trimmed.length >= 3 ? trimmed : "player";
}

/** Find a username that is free, appending a numeric suffix on collision. */
async function uniqueUsername(email: string): Promise<string> {
  const base = baseUsername(email);
  // Try the bare base first, then base1, base2, … until one is free.
  for (let i = 0; i < 10000; i++) {
    const candidate = i === 0 ? base : `${base.slice(0, 20 - String(i).length)}${i}`;
    const taken = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  // Extremely unlikely fallback — guaranteed-unique random suffix.
  return `${base.slice(0, 14)}${Date.now().toString(36).slice(-5)}`;
}

// ─── Resolve / create the user ──────────────────────────────────────────────────
function toSessionUser(u: {
  id: string; email: string; name: string; username: string; role: string; avatarUrl: string | null;
}): SessionUser {
  return { id: u.id, email: u.email, name: u.name, username: u.username, role: u.role, avatarUrl: u.avatarUrl ?? undefined };
}

const SELECT = { id: true, email: true, name: true, username: true, role: true, avatarUrl: true } as const;

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

function isUniqueViolation(e: unknown): boolean {
  return Boolean(e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002");
}
