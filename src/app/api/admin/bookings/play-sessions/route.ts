import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { parsePagination, parseDateRange, parseSort, orderByFor } from "@/lib/adminBookings/query";
import { gamePlayerWhereForStatus, deriveGamePlayerStatus, CATEGORY_STATUSES } from "@/lib/adminBookings/status";
import { applyBulk, isActionAllowed, type BookingAction } from "@/lib/adminBookings/actions";
import { toCsv } from "@/lib/adminBookings/csv";
import type { BookingRow, ListResponse, StatusCount } from "@/lib/adminBookings/types";

const INCLUDE = {
  user: { select: { name: true, email: true, phone: true } },
  game: { select: { title: true, sport: true, scheduledAt: true } },
} as const;

function toRow(p: any): BookingRow {
  return {
    id: p.id, userId: p.userId, userName: p.user?.name ?? "—", userEmail: p.user?.email ?? "—",
    userPhone: p.user?.phone ?? null, entityName: p.game?.title ?? "—",
    status: deriveGamePlayerStatus(p.status, p.attended),
    createdAt: p.joinedAt.toISOString(), updatedAt: p.updatedAt?.toISOString() ?? null,
    sessionDate: p.game?.scheduledAt?.toISOString() ?? null,
    extra: { sport: p.game?.sport ?? "—" }, payment: null,
  };
}

function buildWhere(p: URLSearchParams, now: Date) {
  const status = p.get("status") ?? "all";
  const q = p.get("q")?.trim();
  const range = parseDateRange(p, now);
  const where: Record<string, unknown> = { ...gamePlayerWhereForStatus(status) };
  if (range) where.joinedAt = { gte: range.gte, ...(range.lte ? { lte: range.lte } : {}) };
  if (q) where.OR = [
    { id: { contains: q, mode: "insensitive" } },
    { user: { name: { contains: q, mode: "insensitive" } } },
    { user: { email: { contains: q, mode: "insensitive" } } },
    { game: { title: { contains: q, mode: "insensitive" } } },
  ];
  return where;
}

async function statusCounts(countWhere: Record<string, unknown>): Promise<StatusCount[]> {
  const base = { ...countWhere }; delete (base as any).status; delete (base as any).attended;
  const [cancelled, attended, noShow, joined] = await Promise.all([
    prisma.gamePlayer.count({ where: { ...base, status: "cancelled" } }),
    prisma.gamePlayer.count({ where: { ...base, status: { not: "cancelled" }, attended: true } }),
    prisma.gamePlayer.count({ where: { ...base, status: { not: "cancelled" }, attended: false } }),
    prisma.gamePlayer.count({ where: { ...base, status: { not: "cancelled" }, attended: null } }),
  ]);
  const m: Record<string, number> = { cancelled, attended, "no-show": noShow, joined };
  return CATEGORY_STATUSES["play-sessions"].map(s => ({ status: s, count: m[s] ?? 0 }));
}

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams: p } = new URL(req.url);
  const now = new Date();
  const where = buildWhere(p, now);

  if (p.get("format") === "csv") {
    const rows = await prisma.gamePlayer.findMany({ where, include: INCLUDE, orderBy: { joinedAt: "desc" } });
    const mapped = rows.map(toRow);
    const headers = ["Booking ID", "User", "Email", "Phone", "Game", "Sport", "Date", "Status", "Joined"];
    const csv = toCsv(headers, mapped.map(r => [r.id, r.userName, r.userEmail, r.userPhone, r.entityName, r.extra.sport, r.sessionDate, r.status, r.createdAt]));
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="play-sessions-bookings.csv"` } });
  }

  const { skip, take, page, pageSize } = parsePagination(p);
  const orderBy = orderByFor(parseSort(p), "joinedAt", "joinedAt"); // GamePlayer has no own session date; "upcoming" falls back to joinedAt

  const countWhere = buildWhere(new URLSearchParams({ ...Object.fromEntries(p), status: "all" }), now);
  const [rows, total, counts] = await Promise.all([
    prisma.gamePlayer.findMany({ where, include: INCLUDE, orderBy, skip, take }),
    prisma.gamePlayer.count({ where }),
    statusCounts(countWhere),
  ]);
  const body: ListResponse = { rows: rows.map(toRow), total, page, pageSize, counts };
  return NextResponse.json(body);
}

export async function PATCH(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { ids, id, action } = await req.json();
  const list: string[] = Array.isArray(ids) ? ids : id ? [id] : [];
  if (!list.length || !action) return NextResponse.json({ error: "Missing ids/action" }, { status: 400 });
  if (!isActionAllowed("play-sessions", action as BookingAction)) return NextResponse.json({ error: "Action not allowed" }, { status: 400 });
  const results = await applyBulk("play-sessions", list, action as BookingAction);
  return NextResponse.json({ results });
}
