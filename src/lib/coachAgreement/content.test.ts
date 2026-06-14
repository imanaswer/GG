import { describe, it, expect } from "vitest";
import { CURRENT_AGREEMENT_VERSION, getAgreement, agreementPlainText, estimatedReadingMinutes } from "./content";

describe("coach agreement content", () => {
  it("exposes v1.0 as current", () => { expect(CURRENT_AGREEMENT_VERSION).toBe("v1.0"); });
  it("returns all 13 sections for v1.0", () => {
    const a = getAgreement("v1.0");
    expect(a.sections).toHaveLength(13);
    expect(a.sections[0].heading).toMatch(/Professional Conduct/i);
    expect(a.sections[11].heading).toMatch(/Governing Law/i);
    expect(a.sections[12].heading).toMatch(/Electronic Signature/i);
  });
  it("throws for unknown version", () => { expect(() => getAgreement("v9.9")).toThrow(); });
  it("produces a stable plain-text rendering for hashing", () => {
    expect(agreementPlainText("v1.0")).toBe(agreementPlainText("v1.0"));
    expect(agreementPlainText("v1.0").length).toBeGreaterThan(500);
  });
  it("estimates a positive reading time", () => { expect(estimatedReadingMinutes("v1.0")).toBeGreaterThan(0); });
});
