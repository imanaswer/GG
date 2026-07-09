import { describe, it, expect, beforeAll } from "vitest";
import { SignJWT } from "jose";

// Must be set before importing adminAuth so the module-load secret resolves in prod-like envs.
beforeAll(() => {
  process.env.AUTH_SECRET ??= "user-secret-minimum-32-chars-long!!";
  process.env.ADMIN_JWT_SECRET ??= process.env.AUTH_SECRET; // shared-secret worst case
});

describe("verifyAdminToken — vertical privilege escalation guard (C-1)", () => {
  it("rejects a normal user JWT even when signed with the same secret", async () => {
    const { verifyAdminToken } = await import("./adminAuth");
    const secret = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!);
    // A user token as issued by lib/auth.ts — role "player", no admin scope.
    const userToken = await new SignJWT({ id: "u1", role: "player" })
      .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret);
    expect(await verifyAdminToken(userToken)).toBeNull();
  });

  it("rejects a forged token that claims role:admin but lacks scope", async () => {
    const { verifyAdminToken } = await import("./adminAuth");
    const secret = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!);
    const forged = await new SignJWT({ role: "admin" }) // no scope:"admin"
      .setProtectedHeader({ alg: "HS256" }).setIssuedAt().sign(secret);
    expect(await verifyAdminToken(forged)).toBeNull();
  });

  it("accepts a genuine admin token from signAdminToken", async () => {
    const { signAdminToken, verifyAdminToken } = await import("./adminAuth");
    const token = await signAdminToken();
    const payload = await verifyAdminToken(token);
    expect(payload?.role).toBe("admin");
    expect(payload?.scope).toBe("admin");
  });
});
