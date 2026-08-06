import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Browser handoff for mobile Google sign-in (GameGround Mobile Developer PRD §5.2 — scope change).
 *
 * The app has no native Google OAuth client. Instead it opens the *existing* web flow
 * (`/api/auth/google`) in a system browser, the website authenticates as it always has, and then
 * hands a one-time code back to the app over its custom URL scheme.
 *
 * Custom schemes are not exclusive — any installed app can register `ggredesign://` and receive
 * that redirect. So the code by itself grants nothing: the app generates a random `verifier`, sends
 * only `SHA-256(verifier)` into the flow, and must present the verifier to redeem the code. This is
 * PKCE, applied to our own handoff rather than to Google's.
 */

/** Deliberately short: the app redeems immediately, and a wider window is only useful to a thief. */
const CODE_TTL_MS = 90_000;

const b64url = (buf: Buffer) => buf.toString("base64url");

export const sha256 = (value: string) => b64url(createHash("sha256").update(value).digest());

/**
 * The app scheme the code is handed back to. Hardcoded-by-config, never taken from the request:
 * accepting a caller-supplied scheme would turn this route into an open redirect that leaks a
 * live credential to whatever target the attacker named.
 */
export function appRedirectBase(): string {
  return process.env.MOBILE_APP_SCHEME || "ggredesign";
}

export function appRedirectUrl(params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  return `${appRedirectBase()}://auth-callback?${qs}`;
}

/** Base64url-safe check — the challenge arrives as a query param and is stored verbatim. */
export function isValidChallenge(value: string | null): value is string {
  return !!value && /^[A-Za-z0-9_-]{16,128}$/.test(value);
}

/** Mint a single-use code bound to `challenge`. Returns the RAW code — never persisted. */
export async function issueCode(userId: string, challenge: string): Promise<string> {
  const code = b64url(randomBytes(32));
  await prisma.mobileAuthCode.create({
    data: {
      codeHash: sha256(code),
      challenge,
      userId,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  return code;
}

export type RedeemResult = { ok: true; userId: string } | { ok: false };

/**
 * Burn a code and return its user. Every failure — unknown, expired, already used, wrong verifier —
 * answers the same `{ ok: false }`, so the caller cannot probe which codes exist.
 */
export async function redeemCode(code: string, verifier: string): Promise<RedeemResult> {
  const row = await prisma.mobileAuthCode.findUnique({ where: { codeHash: sha256(code) } });
  if (!row) return { ok: false };

  // Burn first, and only if still unused: `updateMany` with a `usedAt: null` guard makes this a
  // single atomic statement, so two concurrent exchanges of one code cannot both win.
  const burn = await prisma.mobileAuthCode.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (burn.count !== 1) return { ok: false };

  if (row.expiresAt.getTime() < Date.now()) return { ok: false };
  if (!verifierMatches(verifier, row.challenge)) return { ok: false };

  return { ok: true, userId: row.userId };
}

function verifierMatches(verifier: string, challenge: string): boolean {
  const a = Buffer.from(sha256(verifier));
  const b = Buffer.from(challenge);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Opportunistic cleanup so the table cannot grow without bound. Failure is never fatal. */
export async function pruneExpiredCodes(): Promise<void> {
  await prisma.mobileAuthCode
    .deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - CODE_TTL_MS) } } })
    .catch(() => {});
}
