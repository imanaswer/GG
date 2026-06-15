import { prisma } from "@/lib/prisma";
import { CURRENT_AGREEMENT_VERSION } from "./content";
export class AgreementGateError extends Error {
  status = 403;
  constructor(msg = "You must sign the Coach Partnership Agreement before continuing.") { super(msg); this.name = "AgreementGateError"; }
}
export async function hasSignedCurrentAgreement(userId: string): Promise<boolean> {
  // Agreements bind to the coach record, not the user account (a coach may have
  // signed via a link before any account existed). Resolve the coach first.
  const coach = await prisma.coach.findUnique({ where: { userId }, select: { id: true } });
  if (!coach) return false;
  const row = await prisma.coachAgreement.findFirst({
    where: { coachId: coach.id, status: "SIGNED", agreementVersion: CURRENT_AGREEMENT_VERSION },
    select: { id: true },
  });
  return !!row;
}
/** Throws AgreementGateError if the coach has not signed the current version. */
export async function requireSignedAgreement(userId: string): Promise<void> {
  if (!(await hasSignedCurrentAgreement(userId))) throw new AgreementGateError();
}
