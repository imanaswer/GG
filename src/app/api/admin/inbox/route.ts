import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSessionFromRequest, getAdminActor } from "@/lib/adminAuth";
import { ok, fail, handleErr } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Grace for the client /verify to land before a capture counts as orphaned. */
const ORPHAN_GRACE_MS = 15 * 60_000;
/** A claim older than this is shown as stale so it can be taken over. */
export const STALE_CLAIM_MS = 24 * 60 * 60_000;

/**
 * The one screen answering "what needs a human right now?".
 *
 * All three sections derive from STATE, not from the ops event log. That is
 * deliberate: if the process dies between a business transaction committing and
 * logOps running, the crash costs an email, never a work item. A refund that is
 * owed is owed because Payment says so.
 */
export async function GET(req: NextRequest) {
  try {
    if (!await getAdminSessionFromRequest(req)) return fail("Unauthorized", 401);
    const now = Date.now();

    const [duePayments, capturedOrders, needsAction] = await Promise.all([
      prisma.payment.findMany({
        where: { status: "refund_pending" },
        orderBy: { createdAt: "asc" }, // oldest debt first — it is the most overdue
        take: 200,
        select: {
          id: true, amount: true, currency: true, entityType: true, entityId: true,
          razorpayPaymentId: true, razorpayOrderId: true, createdAt: true, userId: true,
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.paymentOrder.findMany({
        where: { capturedAt: { not: null, lt: new Date(now - ORPHAN_GRACE_MS) } },
        orderBy: { capturedAt: "asc" },
        take: 200,
        select: {
          razorpayOrderId: true, razorpayPaymentId: true, userId: true,
          entityType: true, entityId: true, amount: true, capturedAt: true,
        },
      }),
      prisma.opsEvent.findMany({
        where: { severity: "action", resolvedAt: null },
        orderBy: { createdAt: "asc" },
        take: 200,
        select: {
          id: true, type: true, title: true, body: true, link: true,
          entityType: true, entityId: true, createdAt: true,
          claimedById: true, claimedByName: true, claimedAt: true,
          attempts: true, deliveredAt: true,
        },
      }),
    ]);

    // An orphan is a captured order with NO Payment row at all. Filtering the join
    // on status "paid" would false-flag every verified-then-refunded payment as an
    // orphan, since its Payment row reads "refunded" — see docs/ops/RUNBOOK.md.
    const orderIds = capturedOrders.map(o => o.razorpayOrderId);
    const known = orderIds.length
      ? new Set((await prisma.payment.findMany({
          where: { razorpayOrderId: { in: orderIds } },
          select: { razorpayOrderId: true },
        })).map(p => p.razorpayOrderId))
      : new Set<string>();
    const orphans = capturedOrders.filter(o => !known.has(o.razorpayOrderId));

    const entityNames = await resolveEntityNames([...duePayments, ...orphans]);
    const ageDays = (d: Date) => Math.floor((now - d.getTime()) / 86_400_000);

    return ok({
      refundsDue: duePayments.map(p => ({
        id: p.id,
        amount: p.amount, currency: p.currency,
        entityType: p.entityType,
        entityName: entityNames[`${p.entityType}:${p.entityId}`] ?? p.entityId,
        userName: p.user?.name ?? "—", userEmail: p.user?.email ?? "—",
        // The id an operator pastes into the Razorpay dashboard to send it back.
        razorpayPaymentId: p.razorpayPaymentId,
        since: p.createdAt.toISOString(), ageDays: ageDays(p.createdAt),
      })),
      orphanedCharges: orphans.map(o => ({
        id: o.razorpayOrderId,
        amount: o.amount,
        entityType: o.entityType,
        entityName: entityNames[`${o.entityType}:${o.entityId}`] ?? o.entityId,
        razorpayPaymentId: o.razorpayPaymentId,
        capturedAt: o.capturedAt?.toISOString() ?? null,
        ageDays: o.capturedAt ? ageDays(o.capturedAt) : 0,
      })),
      needsAction: needsAction.map(e => ({
        id: e.id, type: e.type, title: e.title, body: e.body, link: e.link,
        createdAt: e.createdAt.toISOString(), ageDays: ageDays(e.createdAt),
        claimedById: e.claimedById, claimedByName: e.claimedByName,
        claimedAt: e.claimedAt?.toISOString() ?? null,
        // A claim nobody released blocks the item forever, so it goes stale.
        claimStale: !!e.claimedAt && now - e.claimedAt.getTime() > STALE_CLAIM_MS,
        // Surfaces alerts that gave up: nobody was ever told about this one.
        undelivered: !e.deliveredAt && e.attempts > 0,
      })),
      totals: {
        refundsDue: duePayments.length,
        refundsDuePaise: duePayments.reduce((a, p) => a + p.amount, 0),
        orphanedCharges: orphans.length,
        needsAction: needsAction.length,
      },
    });
  } catch (e) { return handleErr(e); }
}

/** Batch-resolve display names per entity type — four queries, not one per row. */
async function resolveEntityNames(rows: { entityType: string; entityId: string }[]): Promise<Record<string, string>> {
  const byType = new Map<string, string[]>();
  for (const r of rows) {
    if (!byType.has(r.entityType)) byType.set(r.entityType, []);
    byType.get(r.entityType)!.push(r.entityId);
  }
  const out: Record<string, string> = {};
  const load = async (type: string, fn: (ids: string[]) => Promise<{ id: string; title?: string; name?: string }[]>) => {
    const ids = byType.get(type);
    if (!ids?.length) return;
    for (const row of await fn([...new Set(ids)])) out[`${type}:${row.id}`] = row.title ?? row.name ?? row.id;
  };
  await Promise.all([
    load("camp",     ids => prisma.camp.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } })),
    load("workshop", ids => prisma.workshop.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } })),
    load("event",    ids => prisma.sportEvent.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } })),
    load("coach",    ids => prisma.coach.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })),
  ]);
  return out;
}

/** claim / unclaim / resolve a needs-action item. */
export async function PATCH(req: NextRequest) {
  try {
    if (!await getAdminSessionFromRequest(req)) return fail("Unauthorized", 401);
    const { id, action } = await req.json().catch(() => ({}));
    if (!id || !action) return fail("id and action are required", 400);

    const actor = await getAdminActor(req);

    if (action === "claim") {
      // Conditional: only an unclaimed or stale item can be taken, so two admins
      // clicking at once cannot both own it.
      const staleBefore = new Date(Date.now() - STALE_CLAIM_MS);
      const claimed = await prisma.opsEvent.updateMany({
        where: { id, resolvedAt: null, OR: [{ claimedById: null }, { claimedAt: { lt: staleBefore } }] },
        data: { claimedById: actor?.id ?? "shared", claimedByName: actor?.name ?? "Shared login", claimedAt: new Date() },
      });
      if (claimed.count !== 1) return fail("Someone else is already handling this", 409);
      return ok({ claimed: true });
    }

    if (action === "unclaim") {
      // Anyone may release: an item held by someone on holiday must not be stuck.
      await prisma.opsEvent.updateMany({
        where: { id },
        data: { claimedById: null, claimedByName: null, claimedAt: null },
      });
      return ok({ claimed: false });
    }

    if (action === "resolve") {
      await prisma.opsEvent.updateMany({ where: { id, resolvedAt: null }, data: { resolvedAt: new Date() } });
      return ok({ resolved: true }); // idempotent: resolving twice is not an error
    }

    return fail("Unsupported action", 400);
  } catch (e) { return handleErr(e); }
}
