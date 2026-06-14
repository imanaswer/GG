import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { clientIp } from "@/lib/ratelimit";
import { fail, handleErr } from "@/lib/api";
import { fetchAgreementPdf } from "@/lib/coachAgreement/storage";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const isAdmin = await getAdminSessionFromRequest(req);
    const session = await getSessionFromRequest(req);

    const agreement = await prisma.coachAgreement.findUnique({
      where: { id },
      select: { id: true, userId: true, agreementNumber: true, pdfPublicId: true },
    });
    if (!agreement) return fail("Agreement not found", 404);

    const isOwner = !!session && session.id === agreement.userId;
    if (!isAdmin && !isOwner) return fail("You are not allowed to access this document", 403);

    await prisma.coachAgreementAuditLog.create({
      data: {
        agreementId: agreement.id, action: "DOWNLOAD",
        actorId: isAdmin ? "admin" : session!.id, actorRole: isAdmin ? "admin" : "coach",
        ipAddress: clientIp(req),
      },
    });

    const bytes = await fetchAgreementPdf(agreement.pdfPublicId);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${agreement.agreementNumber}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) { return handleErr(e); }
}
