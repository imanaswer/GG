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

export const runtime = "nodejs";

// GET: current signing status for the logged-in coach.
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== "coach") return fail("Coach authentication required", 401);
    const existing = await prisma.coachAgreement.findFirst({
      where: { userId: session.id, status: "SIGNED", agreementVersion: CURRENT_AGREEMENT_VERSION },
      orderBy: { acceptedAt: "desc" },
      select: { id: true, agreementNumber: true, agreementVersion: true, acceptedAt: true, status: true },
    });
    return ok({ signed: !!existing, currentVersion: CURRENT_AGREEMENT_VERSION, agreement: existing });
  } catch (e) { return handleErr(e); }
}

// POST: sign the current agreement.
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== "coach") return fail("Coach authentication required", 401);

    const coach = await prisma.coach.findUnique({ where: { userId: session.id }, select: { id: true } });
    if (!coach) throw new ApiError("No coach profile is linked to this account.", 400);

    const already = await prisma.coachAgreement.findFirst({
      where: { userId: session.id, status: "SIGNED", agreementVersion: CURRENT_AGREEMENT_VERSION },
      select: { id: true, agreementNumber: true },
    });
    if (already) return ok({ alreadySigned: true, agreementNumber: already.agreementNumber });

    const input = SignAgreementSchema.parse(await req.json());
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
        agreementNumber, coachId: coach.id, userId: session.id, agreementVersion: version,
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

    return ok({ agreement: record }, 201);
  } catch (e) { return handleErr(e); }
}
