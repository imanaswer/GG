import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, sessionMock } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock: any = {
    workshop: { findUnique: vi.fn(), update: vi.fn() },
    workshopRegistration: { findFirst: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prismaMock, sessionMock: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getSessionFromRequest: sessionMock }));
vi.mock("@/lib/reputationService", () => ({ recordActivityAndRecompute: vi.fn() }));

import { POST } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (body: unknown) => ({ json: async () => body }) as unknown as Request;
const future = new Date(Date.now() + 7 * 864e5);

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.mockResolvedValue({ id: "u1" });
});

describe("POST /workshops/[id] — paid-registration bypass guard", () => {
  it("rejects direct registration for a PAID workshop without creating a registration", async () => {
    prismaMock.workshop.findUnique.mockResolvedValue({ participants: 0, maxParticipants: 10, registrationDeadline: future, price: 499, status: "open" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req({ participantName: "A", registrationType: "adult" }) as any, ctx("w1"));
    const j = (await res.json()) as { ok: boolean; error?: string };
    expect(res.status).toBe(402);
    expect(j.error).toBe("This workshop requires payment to register");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("still allows direct registration for a FREE workshop (price 0)", async () => {
    prismaMock.workshop.findUnique.mockResolvedValue({ participants: 0, maxParticipants: 10, registrationDeadline: future, price: 0, status: "open" });
    prismaMock.workshopRegistration.findFirst.mockResolvedValue(null);
    prismaMock.$transaction.mockResolvedValue([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req({ participantName: "A", registrationType: "adult" }) as any, ctx("w1"));
    const j = (await res.json()) as { ok: boolean; data?: { registered?: boolean } };
    expect(res.status).toBe(200);
    expect(j.data?.registered).toBe(true);
  });
});
