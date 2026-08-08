import { describe, it, expect, beforeEach } from "vitest";
import { SignJWT } from "jose";
import { signAdminToken, verifyAdminToken, getAdminActor, SHARED_ACTOR } from "./adminAuth";

const SECRET = "test-admin-secret-at-least-32-chars!!";
beforeEach(() => {
  process.env.ADMIN_JWT_SECRET = SECRET;
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reqWith = (token?: string): any => ({ cookies: { get: () => (token ? { value: token } : undefined) } });

describe("signAdminToken / verifyAdminToken", () => {
  it("carries the actor identity", async () => {
    const payload = await verifyAdminToken(await signAdminToken({ id: "u1", name: "Anas" }));
    expect(payload?.sub).toBe("u1");
    expect(payload?.name).toBe("Anas");
  });

  it("still accepts a token minted before named accounts existed", async () => {
    // The claims that matter are unchanged, so a cookie issued before this deploy
    // must keep working for the rest of its 60 minutes rather than 401 mid-session.
    const legacy = await new SignJWT({ role: "admin", scope: "admin" })
      .setProtectedHeader({ alg: "HS256" }).setExpirationTime("60m").setIssuedAt()
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifyAdminToken(legacy)).not.toBeNull();
  });

  it("rejects a player token even when signed with the same secret", async () => {
    const player = await new SignJWT({ role: "player", scope: "user" })
      .setProtectedHeader({ alg: "HS256" }).setExpirationTime("60m").setIssuedAt()
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifyAdminToken(player)).toBeNull();
  });
});

describe("getAdminActor", () => {
  it("returns the named admin", async () => {
    const t = await signAdminToken({ id: "u1", name: "Anas" });
    expect(await getAdminActor(reqWith(t))).toEqual({ id: "u1", name: "Anas" });
  });

  it("falls back to the shared login for a token with no identity", async () => {
    // An old cookie must degrade to an attributable-but-shared actor, never to a
    // null that would leave the action unrecorded.
    const legacy = await new SignJWT({ role: "admin", scope: "admin" })
      .setProtectedHeader({ alg: "HS256" }).setExpirationTime("60m").setIssuedAt()
      .sign(new TextEncoder().encode(SECRET));
    expect(await getAdminActor(reqWith(legacy))).toEqual(SHARED_ACTOR);
  });

  it("is null with no cookie or an invalid one", async () => {
    expect(await getAdminActor(reqWith())).toBeNull();
    expect(await getAdminActor(reqWith("garbage"))).toBeNull();
  });
});
