import { describe, it, expect, vi, beforeEach } from "vitest";
const findFirst = vi.fn();
vi.mock("@/lib/prisma", () => ({ prisma: { coachAgreement: { findFirst: (...a: unknown[]) => findFirst(...a) } } }));
import { hasSignedCurrentAgreement, requireSignedAgreement, AgreementGateError } from "./gate";
beforeEach(() => findFirst.mockReset());
describe("hasSignedCurrentAgreement", () => {
  it("true when a SIGNED current-version row exists for the user", async () => { findFirst.mockResolvedValue({ id: "a1" }); expect(await hasSignedCurrentAgreement("u1")).toBe(true); });
  it("false when none", async () => { findFirst.mockResolvedValue(null); expect(await hasSignedCurrentAgreement("u1")).toBe(false); });
});
describe("requireSignedAgreement", () => {
  it("throws AgreementGateError when unsigned", async () => { findFirst.mockResolvedValue(null); await expect(requireSignedAgreement("u1")).rejects.toBeInstanceOf(AgreementGateError); });
  it("resolves when signed", async () => { findFirst.mockResolvedValue({ id: "a1" }); await expect(requireSignedAgreement("u1")).resolves.toBeUndefined(); });
});
