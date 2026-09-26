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
import { sendEmail, emails } from "@/lib/email";

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
const CUSTOMER_CHANNEL = "customer-email";

// ─── Customer templates ───────────────────────────────────────────────────────
// Six of the eleven templates in lib/email.ts were fully written and sent by
// nothing: bookingMade, bookingConfirmed, campRegistered, newBookingForCoach,
// bookingApproved, bookingRejected. They are wired here rather than at each call
// site so a customer mail gets the same durability and retry as an admin alert.
//
// Everything a template needs travels in `meta`, set by the emit site. The
// recipient is meta.to when present (a coach, who may not be a User at all) and
// otherwise the row's user, resolved at send time so a changed address is picked
// up and no email is copied into this table.
type Meta = Record<string, string>;
type Rendered = { subject: string; html: string };

const CUSTOMER_TEMPLATES: Record<string, (m: Meta) => Rendered | null> = {
  "booking.created":       m => emails.bookingMade(m.playerName, m.coachName, m.batch),
  "booking.created.coach": m => emails.newBookingForCoach(m.coachName, m.playerName, m.batch, m.note || undefined),
  "booking.approved":      m => emails.bookingApproved(m.playerName, m.coachName, m.batch, m.address ?? "", m.phone ?? ""),
  "booking.rejected":      m => emails.bookingRejected(m.playerName, m.coachName, m.batch, m.reason || undefined),
  "booking.confirmed":     m => emails.bookingConfirmed(m.playerName, m.coachName, m.batch, m.address ?? "", m.phone ?? ""),
  // One type covers camps, workshops and events; only camps has a written template.
  "registration.created":  m => (m.entity === "camp"
    ? emails.campRegistered(m.parentName, m.childName, m.campName, m.dates, m.contact ?? "")
    : null),
};
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

/**
 * Build the input and log it, swallowing failures in the BUILDER as well as the
 * write. `void logOps({ ...expr })` looks safe but is not: the object literal is
 * evaluated in the request path, so one unexpected null while assembling an alert
 * would throw and fail a booking that had already committed. That is precisely the
 * inversion this module exists to prevent, so the builder runs behind the guard too.
 */
export function logOpsSafe(build: () => OpsInput): void {
  let input: OpsInput;
  try {
    input = build();
  } catch (err) {
    logger.error("logOps input build failed", { err });
    return;
  }
  void logOps(input);
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
      select: { id: true, type: true, title: true, body: true, link: true, channels: true, userId: true, meta: true },
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

      // Send only the channels this row still owes. Skipping the whole row when ANY
      // channel had succeeded would strand the rest: a row whose admin mail sent
      // and whose customer mail failed would never retry the customer send, and
      // would be counted as delivered.
      const intended = [ADMIN_CHANNEL, ...(CUSTOMER_TEMPLATES[row.type] ? [CUSTOMER_CHANNEL] : [])];
      const missing = intended.filter(c => !row.channels.includes(c));
      if (missing.length === 0) { sent++; continue; }

      const delivered: string[] = [];
      for (const channel of missing) {
        const ok = channel === ADMIN_CHANNEL
          ? await notifyAdmin(row.title, adminBody(row))
          : await sendCustomerEmail(row);
        if (ok) delivered.push(channel);
      }

      if (delivered.length > 0) {
        await prisma.opsEvent.update({
          where: { id: row.id },
          data: {
            channels: { push: delivered },
            // Done only once nothing is outstanding, so a partial success stays in
            // the sweep for the channels that still failed.
            ...(delivered.length === missing.length ? { deliveredAt: new Date() } : {}),
          },
        });
      }
      if (delivered.length === missing.length) sent++; else failed++;
    }
  } catch (err) {
    logger.error("dispatchPending failed", { err });
  }
  return { sent, failed };
}

/**
 * Render and send this event's customer email. Returns true when there was nothing
 * to send, so a row with no resolvable recipient settles instead of retrying five
 * times against an address that will never exist.
 */
async function sendCustomerEmail(row: {
  type: string; userId: string | null; meta: unknown;
}): Promise<boolean> {
  const render = CUSTOMER_TEMPLATES[row.type];
  if (!render) return true;

  const meta = (row.meta ?? {}) as Meta;
  const to = meta.to
    ?? (row.userId
      ? (await prisma.user.findUnique({ where: { id: row.userId }, select: { email: true } }))?.email
      : null);
  if (!to) return true; // nobody to tell — not a failure worth retrying

  const tpl = render(meta);
  if (!tpl) return true; // this type has no template for this entity
  return sendEmail({ to, subject: tpl.subject, html: tpl.html });
}

function adminBody(row: { title: string; body: string | null; link: string | null }): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.gameground.net";
  const link = row.link ? `<p style="margin:16px 0 0"><a href="${base}${row.link}" style="color:#fff">Open in admin</a></p>` : "";
  return `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:520px">
    <h2 style="margin:0 0 8px;font-size:17px;color:#111">${row.title}</h2>
    ${row.body ? `<p style="margin:0;color:#374151;font-size:14px">${row.body}</p>` : ""}${link}
  </div>`;
}
