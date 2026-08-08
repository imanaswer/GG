import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api";
import { notifyAdmin, adminAlertHtml } from "@/lib/notifyAdmin";
import { PAYMENT_REVENUE_WHERE } from "@/lib/paymentStatus";

export const maxDuration = 60;

/**
 * The daily ops summary, at 09:00 IST (30 3 * * * UTC in vercel.json — daily is safe
 * there; only sub-daily breaks the Hobby plan).
 *
 * This is the safety net. It reads durable database state rather than replaying what
 * was sent, so it still tells the truth on a day when every individual alert failed
 * to deliver — which is exactly the day it matters.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.NODE_ENV === "production" && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60_000);

  const [
    newBookings, newCamps, newWorkshops, newEvents, newGamePlayers,
    capturedAgg, refundsDue, refundsDueAgg,
    coachesPending, bookingsPending, eventRegsPending, failedAlerts,
  ] = await Promise.all([
    prisma.booking.count({ where: { createdAt: { gte: since } } }),
    prisma.campRegistration.count({ where: { registeredAt: { gte: since } } }),
    prisma.workshopRegistration.count({ where: { registeredAt: { gte: since } } }),
    prisma.eventRegistration.count({ where: { registeredAt: { gte: since } } }),
    prisma.gamePlayer.count({ where: { joinedAt: { gte: since } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, _count: true, where: { ...PAYMENT_REVENUE_WHERE, paidAt: { gte: since } } }),
    prisma.payment.count({ where: { status: "refund_pending" } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "refund_pending" } }),
    prisma.coach.count({ where: { status: "pending_approval" } }),
    prisma.booking.count({ where: { status: "pending" } }),
    prisma.eventRegistration.count({ where: { status: "pending" } }),
    // Alerts that exhausted their retries — the digest is how you find out at all.
    prisma.opsEvent.count({ where: { deliveredAt: null, attempts: { gte: 5 } } }),
  ]);

  const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
  const signups = newBookings + newCamps + newWorkshops + newEvents + newGamePlayers;

  const lines = [
    { label: "New sign-ups (24h)", value: String(signups) },
    { label: "  coach / camp / workshop / event / game", value: `${newBookings} / ${newCamps} / ${newWorkshops} / ${newEvents} / ${newGamePlayers}` },
    { label: "Captured (24h)", value: `${rupees(capturedAgg._sum.amount ?? 0)} over ${capturedAgg._count} payments` },
    { label: "Refunds due", value: refundsDue > 0 ? `${refundsDue} — ${rupees(refundsDueAgg._sum.amount ?? 0)}` : "none" },
    { label: "Awaiting approval", value: `${coachesPending} coaches · ${bookingsPending} bookings · ${eventRegsPending} event regs` },
  ];
  if (failedAlerts > 0) lines.push({ label: "Undelivered alerts", value: `${failedAlerts} gave up after retries` });

  const html = adminAlertHtml({
    heading: "Game Ground — daily ops digest",
    lines,
    link: { href: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://www.gameground.net"}/admin`, label: "Open admin" },
  });

  const delivered = await notifyAdmin("[GG] Daily ops digest", html);
  return ok({ delivered, signups, refundsDue, failedAlerts });
}
