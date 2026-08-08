/**
 * The ops event backbone: durable record first, delivery second.
 *
 * Vercel gives us no background worker, so a sendEmail that fails inside a request
 * is simply gone — and a lost alert is the exact failure this system exists to fix.
 * Writing the row before attempting any send is what makes retry possible at all;
 * the hourly cron drains whatever has not been delivered.
 *
 * Two rules that must not be broken:
 *
 *  1. logOps is called AFTER the business transaction commits, never inside it. A
 *     duplicate dedupeKey raises P2002, and a P2002 raised inside a live Postgres
 *     transaction poisons it — a notification collision would roll back a booking.
 *     That is the inverse of the contract in lib/push.ts: notifications never
 *     endanger the thing they are announcing.
 *
 *  2. Nothing here throws. Callers use `void logOps(...)` fire-and-forget, the same
 *     shape as the nine existing `void sendPush(...)` sites.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { notifyAdmin } from "@/lib/notifyAdmin";

/** Feed item, work item, or audit row. Only "info" and "action" are ever notified. */
export type OpsSeverity = "info" | "action" | "audit";

export type OpsInput = {
  type: string;
  severity?: OpsSeverity;
  title: string;
  body?: string;
  link?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  actorId?: string;
  actorName?: string;
  /** Natural key for "this already happened", e.g. `refund.due:<paymentId>`. */
  dedupeKey?: string;
  meta?: Record<string, unknown>;
};

const ADMIN_CHANNEL = "admin-email";
/** Give up after this many tries; the row stays visible as a failed alert. */
export const MAX_ATTEMPTS = 5;
/** A claim older than this is assumed dead (function timed out) and may be retaken. */
const STALE_CLAIM_MS = 15 * 60_000;

/**
 * Record that something happened. Returns the row id, or null when the event was a
 * duplicate or the write failed — callers do not care, which is the point.
 */
export async function logOps(input: OpsInput): Promise<string | null> {
  try {
    const row = await prisma.opsEvent.create({
      data: {
        type: input.type,
        severity: input.severity ?? "info",
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        userId: input.userId ?? null,
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? null,
        dedupeKey: input.dedupeKey ?? null,
        meta: (input.meta ?? undefined) as never,
      },
      select: { id: true },
    });
    return row.id;
  } catch (err) {
    // P2002 = the dedupeKey already exists, i.e. this event was already recorded.
    // That is the dedupe working, not a failure, so it is not logged as an error.
    if (isUniqueViolation(err)) return null;
    logger.error("logOps failed", { type: input.type, err });
    return null;
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

/** Audit rows are a record, not an announcement — they are never delivered. */
const NOTIFIABLE: OpsSeverity[] = ["info", "action"];

/**
 * Deliver undelivered events. Safe to run concurrently with itself: each row is
 * claimed by a conditional update, and only the caller whose update actually
 * matched (count === 1) sends it. Never throws; returns what it managed to do.
 */
export async function dispatchPending(limit = 25): Promise<{ sent: number; failed: number }> {
  let sent = 0, failed = 0;
  try {
    const now = new Date();
    const staleCutoff = new Date(now.getTime() - STALE_CLAIM_MS);

    const candidates = await prisma.opsEvent.findMany({
      where: {
        deliveredAt: null,
        attempts: { lt: MAX_ATTEMPTS },
        severity: { in: NOTIFIABLE },
        OR: [{ attemptedAt: null }, { attemptedAt: { lt: staleCutoff } }],
      },
      orderBy: { createdAt: "asc" }, // oldest first: a stuck alert is the urgent one
      take: limit,
      select: { id: true, type: true, title: true, body: true, link: true, channels: true },
    });

    for (const row of candidates) {
      // Compare-and-swap. updateMany reports how many rows matched, so a second
      // concurrent sweep that lost the race sees 0 and moves on without sending.
      const claim = await prisma.opsEvent.updateMany({
        where: {
          id: row.id,
          deliveredAt: null,
          OR: [{ attemptedAt: null }, { attemptedAt: { lt: staleCutoff } }],
        },
        data: { attempts: { increment: 1 }, attemptedAt: new Date() },
      });
      if (claim.count !== 1) continue;

      // Only channels not already delivered, so a partial failure never re-sends.
      if (row.channels.includes(ADMIN_CHANNEL)) { sent++; continue; }

      const ok = await notifyAdmin(row.title, adminBody(row));
      if (ok) {
        await prisma.opsEvent.update({
          where: { id: row.id },
          data: { channels: { push: ADMIN_CHANNEL }, deliveredAt: new Date() },
        });
        sent++;
      } else {
        failed++; // attemptedAt/attempts already stamped; the next sweep retries
      }
    }
  } catch (err) {
    logger.error("dispatchPending failed", { err });
  }
  return { sent, failed };
}

function adminBody(row: { title: string; body: string | null; link: string | null }): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.gameground.net";
  const link = row.link ? `<p style="margin:16px 0 0"><a href="${base}${row.link}" style="color:#e63946">Open in admin</a></p>` : "";
  return `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:520px">
    <h2 style="margin:0 0 8px;font-size:17px;color:#111">${row.title}</h2>
    ${row.body ? `<p style="margin:0;color:#374151;font-size:14px">${row.body}</p>` : ""}${link}
  </div>`;
}
