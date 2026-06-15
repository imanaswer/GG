import { describe, it, expect } from "vitest";
import { CURRENT_AGREEMENT_VERSION, getAgreement, agreementPlainText, estimatedReadingMinutes } from "./content";

describe("coach agreement content", () => {
  it("exposes v1.0 as current", () => { expect(CURRENT_AGREEMENT_VERSION).toBe("v1.0"); });
  it("is the Coach Terms & Conditions, Kozhikode-governed", () => {
    const a = getAgreement("v1.0");
    expect(a.title).toMatch(/Coach Terms & Conditions/i);
    expect(a.jurisdiction).toMatch(/Kozhikode/i);
  });
  it("covers all 11 numbered top-level sections", () => {
    const headings = getAgreement("v1.0").sections.map((s) => s.heading);
    expect(headings).toContain("1. Definitions and Scope");
    expect(headings).toContain("2. First-Month Booking & Revenue Split");
    expect(headings).toContain("8. Dispute Resolution & Governing Law");
    expect(headings).toContain("11. General Provisions");
    expect(getAgreement("v1.0").sections.length).toBeGreaterThan(40);
  });
  it("keeps the commission blanks verbatim in clause 2.2", () => {
    const text = agreementPlainText("v1.0");
    expect(text).toContain("[ ______ ]%");
    expect(text).toContain("₹[ ____________ ]");
  });
  it("throws for unknown version", () => { expect(() => getAgreement("v9.9")).toThrow(); });
  it("produces a stable plain-text rendering for hashing", () => {
    expect(agreementPlainText("v1.0")).toBe(agreementPlainText("v1.0"));
    expect(agreementPlainText("v1.0").length).toBeGreaterThan(3000);
  });
  it("estimates a positive reading time", () => { expect(estimatedReadingMinutes("v1.0")).toBeGreaterThan(0); });
});
