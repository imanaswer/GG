import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const version = sp.get("version")?.trim();
  const status = sp.get("status")?.trim();
  const from = sp.get("from"); const to = sp.get("to");

  const where: Record<string, unknown> = {};
  if (version) where.agreementVersion = version;
  if (status) where.status = status;
  if (from || to) where.acceptedAt = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}) };
  if (q) where.OR = [
    { fullName: { contains: q, mode: "insensitive" } },
    { email: { contains: q, mode: "insensitive" } },
    { agreementNumber: { contains: q, mode: "insensitive" } },
  ];

  const rows = await prisma.coachAgreement.findMany({
    where, orderBy: { acceptedAt: "desc" },
    select: { id: true, agreementNumber: true, fullName: true, email: true, agreementVersion: true, acceptedAt: true, status: true },
  });
  return NextResponse.json({ agreements: rows });
}
