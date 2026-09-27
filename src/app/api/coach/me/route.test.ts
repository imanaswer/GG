import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, sessionMock } = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaMock: { coach: { findUnique: vi.fn(), update: vi.fn() }, user: { update: vi.fn() }, $transaction: vi.fn() } as any,
  sessionMock: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getSessionFromRequest: sessionMock }));
vi.mock("@/lib/coachAgreement/gate", () => ({
  requireSignedAgreement: vi.fn(async () => {}),
  AgreementGateError: class extends Error { status = 403; },
}));

import { PATCH, GET } from "./route";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const req = (body: unknown): any => ({ json: async () => body, headers: new Headers() });

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.mockResolvedValue({ id: "u1", role: "coach" });
  prismaMock.coach.findUnique.mockResolvedValue({ id: "c1", userId: "u1", batches: [], _count: { bookings: 0, reviews: 0 } });
  prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prismaMock));
  prismaMock.coach.update.mockResolvedValue({ id: "c1" });
});

describe("/api/coach/me", () => {
  it("resolves the coach from the session, never from a client-supplied id", async () => {
    await GET(req(null));
    expect(prismaMock.coach.findUnique.mock.calls[0][0].where).toEqual({ userId: "u1" });
  });

  it("refuses players and anonymous callers", async () => {
    sessionMock.mockResolvedValue({ id: "p1", role: "player" });
    expect((await PATCH(req({ description: "x" }))).status).toBe(404);
    sessionMock.mockResolvedValue(null);
    expect((await PATCH(req({ description: "x" }))).status).toBe(401);
  });

  it("drops admin-only fields a coach tries to smuggle in", async () => {
    const res = await PATCH(req({ description: "New bio", priceMin: 1, priceMax: 1, status: "active", seatsLeft: 99, userId: "someone-else" }));
    expect(res.status).toBe(200);
    const data = prismaMock.coach.update.mock.calls[0][0].data;
    expect(data).toEqual({ description: "New bio" });
  });
});
