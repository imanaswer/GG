import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest, getAdminActor } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { parsePagination, buildDateQuery } from "@/lib/adminBookings/query";
import { eventWhereForStatus, deriveEventRegistrationStatus, CATEGORY_STATUSES } from "@/lib/adminBookings/status";
import { applyBulk, isActionAllowed, type BookingAction } from "@/lib/adminBookings/actions";
import { toCsv } from "@/lib/adminBookings/csv";
import type { BookingRow, ListResponse, StatusCount, PaymentInfo } from "@/lib/adminBookings/types";

const INCLUDE = {
  user: { select: { name: true, email: true, phone: true } },
  event: { select: { title: true, startDate: true } },
} as const;

async function paymentFor(eventId: string, userId: string): Promise<PaymentInfo | null> {
  const pay = await prisma.payment.findFirst({ where: { entityType: "event", entityId: eventId, userId }, orderBy: { createdAt: "desc" } });
  return pay ? { amount: pay.amount, currency: pay.currency, status: pay.status, razorpayPaymentId: pay.razorpayPaymentId, paidAt: pay.paidAt?.toISOString() ?? null } : null;
}

function toRow(r: Prisma.EventRegistrationGetPayload<{ include: typeof INCLUDE }>, payment: PaymentInfo | null): BookingRow {
  return {
    id: r.id, userId: r.userId, userName: r.user?.name ?? "—", userEmail: r.user?.email ?? "—",
    userPhone: r.user?.phone ?? null, entityName: r.event?.title ?? "—",
    status: deriveEventRegistrationStatus(r.status, r.paymentStatus),
    createdAt: r.registeredAt.toISOString(), updatedAt: r.updatedAt?.toISOString() ?? null,
    sessionDate: r.event?.startDate?.toISOString() ?? null,
    extra: { team: r.teamName ?? "—" }, payment,
  };
}

const AXIS = { sessionRelation: "event", sessionField: "startDate", bookingField: "registeredAt" };

function buildWhere(p: URLSearchParams, now: Date) {
  const status = p.get("status") ?? "all";
  const q = p.get("q")?.trim();
  const { where: dateWhere } = buildDateQuery(p, now, AXIS);
  const where: Record<string, unknown> = { ...eventWhereForStatus(status), ...dateWhere };
  if (q) where.OR = [
    { id: { contains: q, mode: "insensitive" } },
    { user: { name: { contains: q, mode: "insensitive" } } },
    { user: { email: { contains: q, mode: "insensitive" } } },
    { event: { title: { contains: q, mode: "insensitive" } } },
  ];
  return where;
}

async function statusCounts(countWhere: Record<string, unknown>): Promise<StatusCount[]> {
  const base = { ...countWhere }; delete base.status; delete base.paymentStatus;
  const statuses = CATEGORY_STATUSES.events;
  const counts = await Promise.all(statuses.map(s =>
    prisma.eventRegistration.count({ where: { ...base, ...eventWhereForStatus(s) } })));
  return statuses.map((s, i) => ({ status: s, count: counts[i] }));
}

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams: p } = new URL(req.url);
  const now = new Date();
  const where = buildWhere(p, now);

  if (p.get("format") === "csv") {
    const rows = await prisma.eventRegistration.findMany({ where, include: INCLUDE, orderBy: { registeredAt: "desc" } });
    const mapped = await Promise.all(rows.map(async r => ({ row: toRow(r, null), pay: await paymentFor(r.eventId, r.userId) })));
    const headers = ["Booking ID", "User", "Email", "Phone", "Event", "Team", "Date", "Approval", "Payment", "Created"];
    const csv = toCsv(headers, mapped.map(({ row: r, pay }) => [r.id, r.userName, r.userEmail, r.userPhone, r.entityName, r.extra.team, r.sessionDate, r.status, pay?.status ?? "—", r.createdAt]));
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="events-bookings.csv"` } });
  }

  const { skip, take, page, pageSize } = parsePagination(p);
  const { orderBy } = buildDateQuery(p, now, AXIS);
  const countWhere = buildWhere(new URLSearchParams({ ...Object.fromEntries(p), status: "all" }), now);
  const [rows, total, counts] = await Promise.all([
    prisma.eventRegistration.findMany({ where, include: INCLUDE, orderBy, skip, take }),
    prisma.eventRegistration.count({ where }),
    statusCounts(countWhere),
  ]);
  const withPay = await Promise.all(rows.map(async r => toRow(r, await paymentFor(r.eventId, r.userId))));
  const body: ListResponse = { rows: withPay, total, page, pageSize, counts };
  return NextResponse.json(body);
}

export async function PATCH(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  const { ids, id, action, rejectionReason } = body;
  const list: string[] = Array.isArray(ids) ? ids : id ? [id] : [];
  if (!list.length || !action) return NextResponse.json({ error: "Missing ids/action" }, { status: 400 });
  if (!isActionAllowed("events", action as BookingAction)) return NextResponse.json({ error: "Action not allowed" }, { status: 400 });
  const results = await applyBulk("events", list, action as BookingAction, rejectionReason ? { rejectionReason } : undefined, await getAdminActor(req));
  return NextResponse.json({ results });
}
