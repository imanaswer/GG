import { describe, it, expect } from "vitest";
import { SignAgreementSchema, validateSignature } from "./validation";
const good = {
  fullName: "Asha Rao", email: "asha@example.com", phone: "9876543210", dateOfBirth: "1990-04-01",
  address: "12 MG Road, Kozhikode", emergencyContactName: "Ravi Rao", emergencyContactNumber: "9876500000",
  signatureName: "Asha Rao", signedDate: "2026-06-15",
  confirmAccurate: true, agreeAgreement: true, consentESign: true, understandTermination: true,
};
describe("SignAgreementSchema", () => {
  it("accepts a complete valid payload", () => { expect(SignAgreementSchema.safeParse(good).success).toBe(true); });
  it("rejects when any checkbox is false", () => { expect(SignAgreementSchema.safeParse({ ...good, consentESign: false }).success).toBe(false); });
  it("rejects missing personal fields", () => { expect(SignAgreementSchema.safeParse({ ...good, address: "" }).success).toBe(false); });
});
describe("validateSignature", () => {
  it("matches after trimming whitespace", () => { expect(validateSignature("  Asha Rao ", "Asha Rao")).toBe(true); });
  it("rejects a mismatch", () => { expect(validateSignature("A. Rao", "Asha Rao")).toBe(false); });
});
