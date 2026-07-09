import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, sessionMock, adminMock } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock: any = {
    sportEvent: { findUnique: vi.fn(), update: vi.fn() },
    eventRegistration: { findFirst: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prismaMock, sessionMock: vi.fn(), adminMock: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getSessionFromRequest: sessionMock }));
vi.mock("@/lib/adminAuth", () => ({ getAdminSessionFromRequest: adminMock }));
vi.mock("@/lib/reputationService", () => ({ recordActivityAndRecompute: vi.fn() }));

import { POST } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (body: unknown) => ({ json: async () => body }) as unknown as Request;
const future = new Date(Date.now() + 7 * 864e5);

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.mockResolvedValue({ id: "u1" });
  adminMock.mockResolvedValue(false);
});

describe("POST /events/[id] — paid-registration bypass guard", () => {
  it("rejects direct registration for a PAID event without creating a registration", async () => {
    prismaMock.sportEvent.findUnique.mockResolvedValue({ participants: 0, maxParticipants: 50, registrationDeadline: future, entryFeeAmount: 500, status: "Registration Open", published: true, approvalMode: "auto" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req({ teamName: "T" }) as any, ctx("e1"));
    const j = (await res.json()) as { ok: boolean; error?: string };
    expect(res.status).toBe(402);
    expect(j.error).toBe("This event requires payment to register");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("still allows direct registration for a FREE event (entryFeeAmount 0)", async () => {
    prismaMock.sportEvent.findUnique.mockResolvedValue({ participants: 0, maxParticipants: 50, registrationDeadline: future, entryFeeAmount: 0, status: "Registration Open", published: true, approvalMode: "auto" });
    prismaMock.eventRegistration.findFirst.mockResolvedValue(null);
    prismaMock.$transaction.mockResolvedValue([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req({ teamName: "T" }) as any, ctx("e1"));
    const j = (await res.json()) as { ok: boolean; data?: { registered?: boolean } };
    expect(res.status).toBe(200);
    expect(j.data?.registered).toBe(true);
  });
});
