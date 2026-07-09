import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, sessionMock } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock: any = {
    camp: { findUnique: vi.fn(), update: vi.fn() },
    campRegistration: { findFirst: vi.fn(), create: vi.fn() },
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

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.mockResolvedValue({ id: "u1" });
});

describe("POST /camps/[id] — paid-registration bypass guard", () => {
  it("rejects direct registration for a PAID camp (must pay) without creating a registration", async () => {
    prismaMock.camp.findUnique.mockResolvedValue({ participants: 0, maxParticipants: 10, status: "open", price: 3000 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req({ childName: "Kid", childAge: 8 }) as any, ctx("c1"));
    const j = (await res.json()) as { ok: boolean; error?: string };
    expect(res.status).toBe(402);
    expect(j.error).toBe("This camp requires payment to register");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.campRegistration.create).not.toHaveBeenCalled();
  });

  it("still allows direct registration for a FREE camp (price 0)", async () => {
    prismaMock.camp.findUnique.mockResolvedValue({ participants: 0, maxParticipants: 10, status: "open", price: 0 });
    prismaMock.campRegistration.findFirst.mockResolvedValue(null);
    prismaMock.$transaction.mockResolvedValue([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req({ childName: "Kid", childAge: 8 }) as any, ctx("c1"));
    const j = (await res.json()) as { ok: boolean; data?: { registered?: boolean } };
    expect(res.status).toBe(200);
    expect(j.data?.registered).toBe(true);
  });
});
