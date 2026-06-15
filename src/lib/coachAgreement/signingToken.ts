import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const DEFAULT_TTL_DAYS = 30;

export type TokenState = "valid" | "expired" | "used" | "invalid";
export type ResolvedToken = { coachId: string; state: TokenState };

/** Create a secure, single-use, expiring signing token for a coach. Returns the raw token. */
export async function generateSigningToken(coachId: string, ttlDays = DEFAULT_TTL_DAYS): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  await prisma.coachSigningToken.create({ data: { coachId, token, expiresAt } });
  return token;
}

/** Resolve a raw token to its coach + state. `invalid` for unknown tokens. */
export async function resolveSigningToken(token: string): Promise<ResolvedToken | null> {
  if (!token) return null;
  const row = await prisma.coachSigningToken.findUnique({
    where: { token },
    select: { coachId: true, expiresAt: true, usedAt: true },
  });
  if (!row) return null;
  let state: TokenState = "valid";
  if (row.usedAt) state = "used";
  else if (row.expiresAt.getTime() < Date.now()) state = "expired";
  return { coachId: row.coachId, state };
}

/** Mark a token consumed once its agreement is signed. Idempotent. */
export async function markSigningTokenUsed(token: string): Promise<void> {
  await prisma.coachSigningToken.updateMany({
    where: { token, usedAt: null },
    data: { usedAt: new Date() },
  });
}

/** Absolute /onboarding-terms link carrying the token (for emails / admin copy / WhatsApp). */
export function buildSignLink(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${base}/onboarding-terms?token=${encodeURIComponent(token)}`;
}
