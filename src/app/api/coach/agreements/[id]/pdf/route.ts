import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { clientIp } from "@/lib/ratelimit";
import { fail, handleErr } from "@/lib/api";
import { fetchAgreementPdf } from "@/lib/coachAgreement/storage";
import { resolveSigningToken } from "@/lib/coachAgreement/signingToken";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const isAdmin = await getAdminSessionFromRequest(req);
    const session = await getSessionFromRequest(req);

    const agreement = await prisma.coachAgreement.findUnique({
      where: { id },
      select: { id: true, coachId: true, userId: true, agreementNumber: true, pdfPublicId: true },
    });
    if (!agreement) return fail("Agreement not found", 404);

    const isOwner = !!session && !!agreement.userId && session.id === agreement.userId;
    // A signing token for this agreement's coach also grants access to the PDF
    // (so a coach who signed via link, with no login, can still download it).
    // Used/expired tokens still allow download — they remain proof of being that coach.
    let isTokenOwner = false;
    if (!isAdmin && !isOwner) {
      const token = new URL(req.url).searchParams.get("token");
      if (token) {
        const resolved = await resolveSigningToken(token);
        isTokenOwner = !!resolved && resolved.coachId === agreement.coachId;
      }
    }
    if (!isAdmin && !isOwner && !isTokenOwner) return fail("You are not allowed to access this document", 403);

    // Fetch first so the audit trail records only downloads that actually
    // delivered bytes — a failed Cloudinary fetch must not log a phantom download.
    const bytes = await fetchAgreementPdf(agreement.pdfPublicId);

    await prisma.coachAgreementAuditLog.create({
      data: {
        agreementId: agreement.id, action: "DOWNLOAD",
        actorId: isAdmin ? "admin" : (session?.id ?? agreement.userId ?? agreement.coachId), actorRole: isAdmin ? "admin" : "coach",
        ipAddress: clientIp(req),
      },
    });

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${agreement.agreementNumber}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) { return handleErr(e); }
}
