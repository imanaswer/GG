import { describe, it, expect } from "vitest";
import { computeAgreementHash } from "./hash";
const base = { content: "AGREEMENT TEXT", version: "v1.0", signatureName: "Asha Rao", acceptedAtISO: "2026-06-15T10:00:00.000Z" };
describe("computeAgreementHash", () => {
  it("is a 64-char hex sha256", () => { expect(computeAgreementHash(base)).toMatch(/^[a-f0-9]{64}$/); });
  it("is deterministic for identical input", () => { expect(computeAgreementHash(base)).toBe(computeAgreementHash(base)); });
  it("changes when any field changes", () => {
    const h0 = computeAgreementHash(base);
    expect(computeAgreementHash({ ...base, signatureName: "Asha  Rao" })).not.toBe(h0);
    expect(computeAgreementHash({ ...base, version: "v1.1" })).not.toBe(h0);
    expect(computeAgreementHash({ ...base, acceptedAtISO: "2026-06-15T10:00:01.000Z" })).not.toBe(h0);
  });
});
