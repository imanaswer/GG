import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { parsePagination, parseDateRange, parseSort, orderByFor } from "@/lib/adminBookings/query";
import { coachWhereForStatus, CATEGORY_STATUSES } from "@/lib/adminBookings/status";
import { applyBulk, isActionAllowed, type BookingAction } from "@/lib/adminBookings/actions";
import { toCsv } from "@/lib/adminBookings/csv";
import type { BookingRow, ListResponse, StatusCount } from "@/lib/adminBookings/types";

function buildWhere(p: URLSearchParams, now: Date) {
  const status = p.get("status") ?? "all";
  const q = p.get("q")?.trim();
  const range = parseDateRange(p, now);
  const where: Record<string, unknown> = { ...coachWhereForStatus(status) };
  if (range) where.createdAt = { gte: range.gte, ...(range.lte ? { lte: range.lte } : {}) };
  if (q) where.OR = [
    { id: { contains: q, mode: "insensitive" } },
    { user: { name: { contains: q, mode: "insensitive" } } },
    { user: { email: { contains: q, mode: "insensitive" } } },
    { coach: { name: { contains: q, mode: "insensitive" } } },
  ];
  return where;
}

const INCLUDE = {
  user:  { select: { name: true, email: true, phone: true } },
  coach: { select: { name: true, sport: true } },
  batch: { select: { day: true, time: true } },
} as const;

function toRow(b: any): BookingRow {
  return {
    id: b.id, userId: b.userId, userName: b.user?.name ?? "—", userEmail: b.user?.email ?? "—",
    userPhone: b.user?.phone ?? null, entityName: b.coach?.name ?? "—", status: b.status,
    createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt?.toISOString() ?? null,
    sessionDate: null,
    extra: {
      sport: b.coach?.sport ?? "—",
      session: b.batch ? `${b.batch.day} ${b.batch.time}` : "1:1",
      rejectionReason: b.rejectionReason ?? "",
      coachNote: b.coachNote ?? "",
      note: b.note ?? "",
    },
    payment: null,
  };
}

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams: p } = new URL(req.url);
  const now = new Date();
  const where = buildWhere(p, now);

  if (p.get("format") === "csv") {
    const rows = await prisma.booking.findMany({ where, include: INCLUDE, orderBy: { createdAt: "desc" } });
    const mapped = rows.map(toRow);
    const headers = ["Booking ID", "User", "Email", "Phone", "Coach", "Sport", "Session", "Status", "Created"];
    const csv = toCsv(headers, mapped.map(r => [r.id, r.userName, r.userEmail, r.userPhone, r.entityName, r.extra.sport, r.extra.session, r.status, r.createdAt]));
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="coaches-bookings.csv"` } });
  }

  const { skip, take, page, pageSize } = parsePagination(p);
  const orderBy = orderByFor(parseSort(p), "createdAt", "createdAt");

  const countWhere = buildWhere(new URLSearchParams({ ...Object.fromEntries(p), status: "all" }), now);
  const [rows, total, grouped] = await Promise.all([
    prisma.booking.findMany({ where, include: INCLUDE, orderBy, skip, take }),
    prisma.booking.count({ where }),
    prisma.booking.groupBy({ by: ["status"], where: countWhere, _count: true }),
  ]);
  const counts: StatusCount[] = CATEGORY_STATUSES.coaches.map(s => ({
    status: s, count: grouped.find(g => g.status === s)?._count ?? 0,
  }));

  const body: ListResponse = { rows: rows.map(toRow), total, page, pageSize, counts };
  return NextResponse.json(body);
}

export async function PATCH(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  const { ids, id, action, rejectionReason } = body;
  const list: string[] = Array.isArray(ids) ? ids : id ? [id] : [];
  if (!list.length || !action) return NextResponse.json({ error: "Missing ids/action" }, { status: 400 });
  if (!isActionAllowed("coaches", action as BookingAction)) return NextResponse.json({ error: "Action not allowed" }, { status: 400 });
  const results = await applyBulk("coaches", list, action as BookingAction, { rejectionReason });
  return NextResponse.json({ results });
}
