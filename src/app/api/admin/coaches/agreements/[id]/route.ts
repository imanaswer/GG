import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { getAgreement } from "@/lib/coachAgreement/content";
import { clientIp } from "@/lib/ratelimit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const agreement = await prisma.coachAgreement.findUnique({ where: { id } });
  if (!agreement) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Audit every admin view of an agreement.
  await prisma.coachAgreementAuditLog.create({
    data: { agreementId: agreement.id, action: "VIEW", actorId: "admin", actorRole: "admin", ipAddress: clientIp(req) },
  });

  // Always render the EXACT accepted version, never the latest.
  let content = null;
  try { content = getAgreement(agreement.agreementVersion); } catch { content = null; }

  const auditLogs = await prisma.coachAgreementAuditLog.findMany({
    where: { agreementId: agreement.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ agreement, content, auditLogs });
}
