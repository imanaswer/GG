import { describe, it, expect, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { coachSigningToken: { findUnique: (...a: unknown[]) => findUnique(...a) } },
}));

import { resolveSigningToken, buildSignLink } from "./signingToken";

beforeEach(() => findUnique.mockReset());

describe("resolveSigningToken", () => {
  it("returns null for an unknown token", async () => {
    findUnique.mockResolvedValue(null);
    expect(await resolveSigningToken("nope")).toBeNull();
  });

  it("returns valid for a fresh, unused token", async () => {
    findUnique.mockResolvedValue({ coachId: "c1", expiresAt: new Date(Date.now() + 1000), usedAt: null });
    expect(await resolveSigningToken("t")).toEqual({ coachId: "c1", state: "valid" });
  });

  it("returns used when usedAt is set (takes priority over expiry)", async () => {
    findUnique.mockResolvedValue({ coachId: "c1", expiresAt: new Date(Date.now() - 1000), usedAt: new Date() });
    expect(await resolveSigningToken("t")).toEqual({ coachId: "c1", state: "used" });
  });

  it("returns expired for a past, unused token", async () => {
    findUnique.mockResolvedValue({ coachId: "c1", expiresAt: new Date(Date.now() - 1000), usedAt: null });
    expect(await resolveSigningToken("t")).toEqual({ coachId: "c1", state: "expired" });
  });
});

describe("buildSignLink", () => {
  it("builds an onboarding-terms link carrying the token", () => {
    expect(buildSignLink("abc")).toMatch(/\/onboarding-terms\?token=abc$/);
  });
});
