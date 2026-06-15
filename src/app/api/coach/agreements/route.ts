import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { clientIp } from "@/lib/ratelimit";
import { ok, fail, handleErr, ApiError } from "@/lib/api";
import { CURRENT_AGREEMENT_VERSION, agreementPlainText } from "@/lib/coachAgreement/content";
import { SignAgreementSchema, validateSignature } from "@/lib/coachAgreement/validation";
import { formatAgreementNumber } from "@/lib/coachAgreement/agreementNumber";
import { computeAgreementHash } from "@/lib/coachAgreement/hash";
import { generateAgreementPdf } from "@/lib/coachAgreement/pdf";
import { uploadAgreementPdf } from "@/lib/coachAgreement/storage";
import { sendEmail, emails } from "@/lib/email";
import { verifyAgreementToken } from "@/lib/coachAgreement/token";

export const runtime = "nodejs";

// Resolve the acting coach's userId from either a coach login session OR a
// per-coach signing token (so coaches can sign via a link without logging in).
async function resolveCoachUserId(req: NextRequest, bodyToken?: string): Promise<string | null> {
  const session = await getSessionFromRequest(req);
  if (session && session.role === "coach") return session.id;
  const token = bodyToken ?? new URL(req.url).searchParams.get("token") ?? undefined;
  if (token) return verifyAgreementToken(token);
  return null;
}

// GET: current signing status + prefill for the coach (session- or token-identified).
export async function GET(req: NextRequest) {
  try {
    const userId = await resolveCoachUserId(req);
    if (!userId) return fail("Coach authentication required", 401);
    const coach = await prisma.coach.findUnique({
      where: { userId },
      select: { name: true, email: true, phone: true, address: true },
    });
    const existing = await prisma.coachAgreement.findFirst({
      where: { userId, status: "SIGNED", agreementVersion: CURRENT_AGREEMENT_VERSION },
      orderBy: { acceptedAt: "desc" },
      select: { id: true, agreementNumber: true, agreementVersion: true, acceptedAt: true, status: true },
    });
    return ok({
      signed: !!existing,
      currentVersion: CURRENT_AGREEMENT_VERSION,
      agreement: existing,
      prefill: coach ? { fullName: coach.name, email: coach.email, phone: coach.phone, address: coach.address } : null,
    });
  } catch (e) { return handleErr(e); }
}

// POST: sign the current agreement.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = await resolveCoachUserId(req, typeof body?.token === "string" ? body.token : undefined);
    if (!userId) return fail("Coach authentication required", 401);

    const coach = await prisma.coach.findUnique({ where: { userId }, select: { id: true } });
    if (!coach) throw new ApiError("No coach profile is linked to this account.", 400);

    const already = await prisma.coachAgreement.findFirst({
      where: { userId, status: "SIGNED", agreementVersion: CURRENT_AGREEMENT_VERSION },
      select: { id: true, agreementNumber: true },
    });
    if (already) return ok({ alreadySigned: true, agreementNumber: already.agreementNumber });

    // SignAgreementSchema strips the extra `token` key (zod objects drop unknowns).
    const input = SignAgreementSchema.parse(body);
    if (!validateSignature(input.signatureName, input.fullName)) {
      throw new ApiError("Signature must exactly match your full legal name.", 422);
    }

    const acceptedAt = new Date();
    const acceptedAtISO = acceptedAt.toISOString();
    const ipAddress = clientIp(req);
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    const version = CURRENT_AGREEMENT_VERSION;
    const content = agreementPlainText(version);
    const agreementHash = computeAgreementHash({ content, version, signatureName: input.signatureName, acceptedAtISO });

    // Reserve a race-safe sequential number.
    const [{ nextval }] = await prisma.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('coach_agreement_seq') AS nextval`;
    const agreementNumber = formatAgreementNumber(acceptedAt.getUTCFullYear(), Number(nextval));

    const pdfBytes = await generateAgreementPdf({
      agreementNumber, version,
      fullName: input.fullName, email: input.email, phone: input.phone,
      dateOfBirth: input.dateOfBirth, address: input.address,
      emergencyContactName: input.emergencyContactName, emergencyContactNumber: input.emergencyContactNumber,
      signatureName: input.signatureName, acceptedAtISO, ipAddress, userAgent, agreementHash,
    });
    const pdfPublicId = await uploadAgreementPdf(pdfBytes, `${coach.id}_${version}`);

    const record = await prisma.coachAgreement.create({
      data: {
        agreementNumber, coachId: coach.id, userId, agreementVersion: version,
        fullName: input.fullName, email: input.email, signatureName: input.signatureName,
        acceptedAt, ipAddress, userAgent, pdfPublicId, pdfResourceType: "raw",
        agreementHash, status: "SIGNED",
        personalSnapshot: {
          phone: input.phone, dateOfBirth: input.dateOfBirth, address: input.address,
          emergencyContactName: input.emergencyContactName, emergencyContactNumber: input.emergencyContactNumber,
          signedDate: input.signedDate,
        },
      },
      select: { id: true, agreementNumber: true, agreementVersion: true, acceptedAt: true },
    });

    // Supersede any older-version SIGNED agreements this coach holds. No-op today
    // (only v1.0 exists); correct when a future version (v1.1+) is signed.
    await prisma.coachAgreement.updateMany({
      where: { userId, status: "SIGNED", agreementVersion: { not: version } },
      data: { status: "SUPERSEDED" },
    });

    // Email the signed PDF to the coach (non-fatal; reuse the bytes we just made).
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
    const pdfUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/coach/agreements/${record.id}/pdf`;
    await sendEmail({
      to: input.email,
      ...emails.agreementSigned(input.fullName, agreementNumber, version, input.signedDate, pdfUrl),
      attachments: [{ filename: `${agreementNumber}.pdf`, content: pdfBase64 }],
    }).catch(() => {});

    return ok({ agreement: record }, 201);
  } catch (e) { return handleErr(e); }
}
