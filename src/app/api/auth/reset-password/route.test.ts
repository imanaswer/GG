import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

const { prismaMock, revokeMock } = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaMock: { user: { findFirst: vi.fn(), updateMany: vi.fn() } } as any,
  revokeMock: vi.fn(async () => 1),
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/refreshToken", () => ({ revokeRefreshTokens: revokeMock }));

import { POST } from "./route";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const req = (body: unknown): any => ({ json: async () => body });
const RAW = "a".repeat(64);
const HASHED = createHash("sha256").update(RAW).digest("hex");

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findFirst.mockResolvedValue({ id: "u1" });
  prismaMock.user.updateMany.mockResolvedValue({ count: 1 });
});

describe("POST /api/auth/reset-password", () => {
  it("rejects a filter object as the token without touching the database", async () => {
    // The takeover this pins: `{ not: null }` used to reach Prisma as a where filter.
    const res = await POST(req({ token: { not: null }, password: "attacker-pw" }));
    expect(res.status).toBe(400);
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
  });

  it("looks the token up by hash, requires an unexpired row, and revokes refresh tokens", async () => {
    const res = await POST(req({ token: RAW, password: "new-password-1" }));
    expect(res.status).toBe(200);
    const where = prismaMock.user.findFirst.mock.calls[0][0].where;
    expect(where.passwordResetToken).toBe(HASHED);
    expect(where.passwordResetExpiry.gt).toBeInstanceOf(Date);
    expect(prismaMock.user.updateMany.mock.calls[0][0].where).toEqual({ id: "u1", passwordResetToken: HASHED });
    expect(revokeMock).toHaveBeenCalledWith("u1", { all: true });
  });

  it("fails when the token was already consumed by a racing request", async () => {
    prismaMock.user.updateMany.mockResolvedValue({ count: 0 });
    expect((await POST(req({ token: RAW, password: "new-password-1" }))).status).toBe(400);
    expect(revokeMock).not.toHaveBeenCalled();
  });
});
