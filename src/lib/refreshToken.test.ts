import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock: any = {
    refreshToken: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  };
  return { prismaMock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ signToken: vi.fn(async () => "access.jwt.token") }));

import { rotateRefreshToken, revokeRefreshTokens, isMobileClient } from "./refreshToken";

const live = {
  id: "rt1", userId: "u1", familyId: "fam1", deviceId: "dev1",
  expiresAt: new Date(Date.now() + 86_400_000),
  revokedAt: null, rotatedAt: null,
};
const activeUser = { id: "u1", email: "a@b.c", name: "A", username: "a", role: "player", avatarUrl: null, deletedAt: null };

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findUnique.mockResolvedValue(activeUser);
  prismaMock.updateManyResult = { count: 1 };
  prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });
});

describe("rotateRefreshToken", () => {
  it("issues a new pair and retires the presented token", async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue(live);

    const res = await rotateRefreshToken("raw-token", "dev1");

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.session.refreshToken).toBeTruthy();
    // The caller's token is replaced, never handed back.
    expect(res.session.refreshToken).not.toBe("raw-token");
    expect(res.user.id).toBe("u1");
  });

  it("stores only a hash — the raw token never reaches the database", async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue(live);

    const res = await rotateRefreshToken("raw-token");
    if (!res.ok) throw new Error("expected rotation to succeed");

    const created = prismaMock.refreshToken.create.mock.calls[0][0].data;
    expect(created.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(created.tokenHash).not.toBe(res.session.refreshToken);
    expect(JSON.stringify(created)).not.toContain(res.session.refreshToken);
  });

  it("keeps the rotation on the same family so replay stays detectable", async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue(live);
    await rotateRefreshToken("raw-token");
    expect(prismaMock.refreshToken.create.mock.calls[0][0].data.familyId).toBe("fam1");
  });

  it("revokes the WHOLE family when an already-rotated token is replayed", async () => {
    // Two parties hold this token and there is no way to tell which is the real
    // client, so both are cut off rather than guessing.
    prismaMock.refreshToken.findUnique.mockResolvedValue({ ...live, rotatedAt: new Date() });

    const res = await rotateRefreshToken("stolen-token");

    expect(res.ok).toBe(false);
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ familyId: "fam1", revokedAt: null }) }),
    );
    expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
  });

  it("rejects a revoked token and issues nothing", async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue({ ...live, revokedAt: new Date() });
    expect((await rotateRefreshToken("revoked")).ok).toBe(false);
    expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
  });

  it("rejects an expired token without revoking the family", async () => {
    // Expiry is ordinary, not evidence of theft — the user just signs in again.
    prismaMock.refreshToken.findUnique.mockResolvedValue({ ...live, expiresAt: new Date(Date.now() - 1000) });

    expect((await rotateRefreshToken("old")).ok).toBe(false);
    expect(prismaMock.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it("rejects an unknown token", async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue(null);
    expect((await rotateRefreshToken("nonsense")).ok).toBe(false);
  });

  it("refuses to refresh into a deleted account and burns the family", async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue(live);
    prismaMock.user.findUnique.mockResolvedValue({ ...activeUser, deletedAt: new Date() });

    expect((await rotateRefreshToken("raw-token")).ok).toBe(false);
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalled();
    expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
  });
});

describe("revokeRefreshTokens", () => {
  it("targets one device when asked", async () => {
    await revokeRefreshTokens("u1", { deviceId: "dev1" });
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "u1", deviceId: "dev1", revokedAt: null }) }),
    );
  });

  it("ignores deviceId when revoking everywhere", async () => {
    await revokeRefreshTokens("u1", { deviceId: "dev1", all: true });
    const where = prismaMock.refreshToken.updateMany.mock.calls[0][0].where;
    expect(where.deviceId).toBeUndefined();
    expect(where.userId).toBe("u1");
  });
});

describe("isMobileClient", () => {
  const req = (headers: Record<string, string>) => new Request("https://x.test", { headers });

  it("recognises the app regardless of header casing", () => {
    expect(isMobileClient(req({ "X-Client": "mobile" }))).toBe(true);
    expect(isMobileClient(req({ "x-client": "Mobile" }))).toBe(true);
  });

  it("treats anything else as the website, so the cookie session is unchanged", () => {
    expect(isMobileClient(req({ "x-client": "web" }))).toBe(false);
    expect(isMobileClient(req({}))).toBe(false);
  });
});
