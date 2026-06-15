import { describe, it, expect } from "vitest";
import { signAgreementToken, verifyAgreementToken } from "./token";

describe("coach agreement signing token", () => {
  it("round-trips a userId", async () => {
    const t = await signAgreementToken("user_123");
    expect(await verifyAgreementToken(t)).toBe("user_123");
  });

  it("rejects a garbage token", async () => {
    expect(await verifyAgreementToken("not.a.jwt")).toBeNull();
  });

  it("rejects a token signed for a different purpose", async () => {
    // A normal login JWT (no purpose claim) must not pass as a signing token.
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "gridgame-dev-secret-key-minimum-32-chars!!");
    const sessionLike = await new SignJWT({ id: "user_123", role: "coach" })
      .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret);
    expect(await verifyAgreementToken(sessionLike)).toBeNull();
  });
});
