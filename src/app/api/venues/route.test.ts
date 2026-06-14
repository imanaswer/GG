import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock: any = { venue: { findMany: vi.fn() } };
  return { prismaMock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET } from "./route";

const hours = (h: number) => new Date(Date.now() + h * 60 * 60_000);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reqWith = (url: string) => ({ url } as any);

async function jsonOf(res: Response) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await res.json()) as { ok: boolean; data?: any[] };
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/venues (openSlots count)", () => {
  it("counts only future, unblocked, unbooked slots and never leaks raw slots", async () => {
    prismaMock.venue.findMany.mockResolvedValue([
      {
        id: "v1", name: "SM Street", description: "", address: "A",
        lat: null, lng: null, images: [], supportedSports: ["Basketball"],
        slots: [
          { startTime: hours(2),  isBlocked: false, game: null },        // available
          { startTime: hours(3),  isBlocked: false, game: null },        // available
          { startTime: hours(4),  isBlocked: true,  game: null },        // blocked
          { startTime: hours(5),  isBlocked: false, game: { id: "g1" } }, // booked
          { startTime: hours(-1), isBlocked: false, game: null },        // expired
        ],
      },
    ]);

    const res = await GET(reqWith("http://x/api/venues?sport=Basketball"));
    const body = await jsonOf(res);

    expect(body.ok).toBe(true);
    expect(body.data![0].openSlots).toBe(2);
    expect(body.data![0]).not.toHaveProperty("slots");
  });
});
