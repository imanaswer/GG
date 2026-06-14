import { prisma } from "@/lib/prisma";
import { CURRENT_AGREEMENT_VERSION } from "./content";
export class AgreementGateError extends Error {
  status = 403;
  constructor(msg = "You must sign the Coach Partnership Agreement before continuing.") { super(msg); this.name = "AgreementGateError"; }
}
export async function hasSignedCurrentAgreement(userId: string): Promise<boolean> {
  const row = await prisma.coachAgreement.findFirst({
    where: { userId, status: "SIGNED", agreementVersion: CURRENT_AGREEMENT_VERSION },
    select: { id: true },
  });
  return !!row;
}
/** Throws AgreementGateError if the coach has not signed the current version. */
export async function requireSignedAgreement(userId: string): Promise<void> {
  if (!(await hasSignedCurrentAgreement(userId))) throw new AgreementGateError();
}
