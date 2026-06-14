import { describe, it, expect } from "vitest";
import { formatAgreementNumber } from "./agreementNumber";
describe("formatAgreementNumber", () => {
  it("zero-pads to 6 digits with year prefix", () => {
    expect(formatAgreementNumber(2026, 1)).toBe("AGR-2026-000001");
    expect(formatAgreementNumber(2026, 42)).toBe("AGR-2026-000042");
  });
  it("does not truncate numbers beyond 6 digits", () => { expect(formatAgreementNumber(2026, 1234567)).toBe("AGR-2026-1234567"); });
});
