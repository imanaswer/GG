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
import { siteUrl } from "@/lib/siteUrl";
import { resolveSigningToken, markSigningTokenUsed, type TokenState } from "@/lib/coachAgreement/signingToken";

export const runtime = "nodejs";

const EXPIRED_MSG = "This link has expired. Please request a new agreement link.";

type Resolved = { coachId: string; tokenState: TokenState | "none"; token?: string } | null;

// Identify the acting coach from a coach login session OR a secure signing token.
// Signing binds to the coach record, so no user account is required.
async function resolveCoach(req: NextRequest, bodyToken?: string): Promise<Resolved> {
  const session = await getSessionFromRequest(req);
  if (session && session.role === "coach") {
    const coach = await prisma.coach.findUnique({ where: { userId: session.id }, select: { id: true } });
    if (coach) return { coachId: coach.id, tokenState: "none" };
  }
  const token = bodyToken ?? new URL(req.url).searchParams.get("token") ?? undefined;
  if (token) {
    const resolved = await resolveSigningToken(token);
    if (resolved) return { coachId: resolved.coachId, tokenState: resolved.state, token };
  }
  return null;
}

// GET: signing status, token state, and prefill for the coach.
export async function GET(req: NextRequest) {
  try {
    const r = await resolveCoach(req);
    if (!r) return fail("Coach authentication required", 401);
    const coach = await prisma.coach.findUnique({
      where: { id: r.coachId },
      select: { name: true, email: true, phone: true, address: true },
    });
    const existing = await prisma.coachAgreement.findFirst({
      where: { coachId: r.coachId, status: "SIGNED", agreementVersion: CURRENT_AGREEMENT_VERSION },
      orderBy: { acceptedAt: "desc" },
      select: { id: true, agreementNumber: true, agreementVersion: true, acceptedAt: true, status: true },
    });
    return ok({
      signed: !!existing,
      tokenState: r.tokenState,
      currentVersion: CURRENT_AGREEMENT_VERSION,
      agreement: existing,
      prefill: coach ? { fullName: coach.name, email: coach.email, phone: coach.phone, address: coach.address } : null,
    });
  } catch (e) { return handleErr(e); }
}

// POST: sign the current agreement (session- or token-identified).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const r = await resolveCoach(req, typeof body?.token === "string" ? body.token : undefined);
    if (!r) return fail("Coach authentication required", 401);

    const coach = await prisma.coach.findUnique({ where: { id: r.coachId }, select: { id: true, userId: true } });
    if (!coach) throw new ApiError("This signing link is no longer valid.", 400);

    const already = await prisma.coachAgreement.findFirst({
      where: { coachId: coach.id, status: "SIGNED", agreementVersion: CURRENT_AGREEMENT_VERSION },
      select: { id: true, agreementNumber: true },
    });
    if (already) return ok({ alreadySigned: true, agreementNumber: already.agreementNumber });

    // A token must still be usable to sign with (a session has tokenState "none").
    if (r.tokenState === "expired") throw new ApiError(EXPIRED_MSG, 410);
    if (r.tokenState === "used") return ok({ alreadySigned: true });

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
        agreementNumber, coachId: coach.id, userId: coach.userId ?? null, agreementVersion: version,
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

    // Consume the signing token now that the agreement exists.
    if (r.token) await markSigningTokenUsed(r.token);

    // Supersede any older-version SIGNED agreements this coach holds. No-op today
    // (only v1.0 exists); correct when a future version (v1.1+) is signed.
    await prisma.coachAgreement.updateMany({
      where: { coachId: coach.id, status: "SIGNED", agreementVersion: { not: version } },
      data: { status: "SUPERSEDED" },
    });

    // Email the signed PDF to the coach (non-fatal; reuse the bytes we just made).
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
    const pdfUrl = `${siteUrl()}/api/coach/agreements/${record.id}/pdf`;
    await sendEmail({
      to: input.email,
      ...emails.agreementSigned(input.fullName, agreementNumber, version, input.signedDate, pdfUrl),
      attachments: [{ filename: `${agreementNumber}.pdf`, content: pdfBase64 }],
    }).catch(() => {});

    return ok({ agreement: record }, 201);
  } catch (e) { return handleErr(e); }
}
