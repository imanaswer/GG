import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";

/**
 * Identity plumbing shared by every social sign-in provider (Google web redirect, Google mobile,
 * Apple mobile). Lifted out of lib/google.ts when Apple arrived so the second provider inherits the
 * same username generation and unique-violation handling instead of growing a subtly different copy.
 */

export const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  username: true,
  role: true,
  avatarUrl: true,
} as const;

export type SelectedUser = {
  id: string;
  email: string;
  name: string;
  username: string;
  role: string;
  avatarUrl: string | null;
};

export function toSessionUser(u: SelectedUser): SessionUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    username: u.username,
    role: u.role,
    avatarUrl: u.avatarUrl ?? undefined,
  };
}

/**
 * Did this sign-in just create the account? The app routes on this: `true` sends
 * a first-time user into account setup, `false` (or absent) sends them Home.
 *
 * Inferred from the row's age rather than plumbed through from the resolver,
 * because the Google flow crosses a browser hop — the route that *learns* the
 * answer (callback) is not the route that *answers the app* (exchange), and the
 * one-time handoff code has nowhere to carry a flag without a schema migration.
 * The code's TTL is 90s (mobileHandoff.ts), so a row older than this window
 * cannot have been created by the sign-in being completed.
 *
 * Imprecise in one direction only: someone who registered on the web a minute
 * ago and then signs in on mobile reads as new, which routes them to setup —
 * where they arguably belong.
 *
 * The durable version of this question is "has this person finished setup",
 * which wants a setupCompletedAt column; this answers "was the row just made".
 */
export const NEW_ACCOUNT_WINDOW_MS = 120_000;

export function isNewAccount(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() < NEW_ACCOUNT_WINDOW_MS;
}

/** Slugify the email local-part to a base username matching the app's rules. */
function baseUsername(email: string): string {
  const local = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
  const trimmed = local.slice(0, 16); // leave room for a numeric suffix (max 20)
  return trimmed.length >= 3 ? trimmed : "player";
}

/** Find a username that is free, appending a numeric suffix on collision. */
export async function uniqueUsername(email: string): Promise<string> {
  const base = baseUsername(email);
  // Try the bare base first, then base1, base2, … until one is free.
  for (let i = 0; i < 10000; i++) {
    const candidate = i === 0 ? base : `${base.slice(0, 20 - String(i).length)}${i}`;
    const taken = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  // Extremely unlikely fallback — guaranteed-unique random suffix.
  return `${base.slice(0, 14)}${Date.now().toString(36).slice(-5)}`;
}

export function isUniqueViolation(e: unknown): boolean {
  return Boolean(e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002");
}
