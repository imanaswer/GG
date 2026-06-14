import { z } from "zod";
const trueLiteral = z.literal(true);
export const SignAgreementSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().email(),
  phone: z.string().trim().min(6).max(20),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  address: z.string().trim().min(4).max(300),
  emergencyContactName: z.string().trim().min(2).max(120),
  emergencyContactNumber: z.string().trim().min(6).max(20),
  signatureName: z.string().trim().min(2).max(120),
  signedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  confirmAccurate: trueLiteral,
  agreeAgreement: trueLiteral,
  consentESign: trueLiteral,
  understandTermination: trueLiteral,
});
export type SignAgreementInput = z.infer<typeof SignAgreementSchema>;
/** Typed signature must exactly match the legal name after trimming. */
export function validateSignature(signature: string, fullName: string): boolean {
  return signature.trim() === fullName.trim();
}
