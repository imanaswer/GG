import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, signMock } = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaMock: { user: { findFirst: vi.fn() } } as any,
  signMock: vi.fn(async () => "tok"),
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/adminAuth", () => ({
  signAdminToken: signMock,
  clearAdminCookie: vi.fn(),
  SHARED_ACTOR: { id: "shared", name: "Shared login" },
}));
vi.mock("@/lib/ratelimit", () => ({
  authLimit: vi.fn(async () => ({ success: true, limit: 5, remaining: 4, reset: 0 })),
  clientIp: () => "1.1.1.1",
  tooManyRequests: vi.fn(),
}));

import { POST } from "./route";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const req = (body: unknown): any => ({ json: async () => body, cookies: { get: () => undefined } });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ADMIN_PASSWORD = "the-shared-one";
  prismaMock.user.findFirst.mockResolvedValue(null);
});

describe("POST /api/admin/auth", () => {
  it("accepts the shared password with NO email", async () => {
    expect((await POST(req({ password: "the-shared-one" }))).status).toBe(200);
  });

  it("still accepts the shared password when an email WAS typed", async () => {
    // The lockout this pins: routing exclusively on a non-empty email meant that
    // with zero admin accounts created, filling the field in — the natural thing
    // to do on a form that shows it — was refused whatever password was used.
    const res = await POST(req({ email: "someone@gmail.com", password: "the-shared-one" }));
    expect(res.status).toBe(200);
    expect(signMock).toHaveBeenCalledWith({ id: "shared", name: "Shared login" });
  });

  it("rejects a wrong password whether or not an email is given", async () => {
    expect((await POST(req({ password: "nope" }))).status).toBe(401);
    expect((await POST(req({ email: "a@b.com", password: "nope" }))).status).toBe(401);
  });

  it("does not reveal whether an address is an admin", async () => {
    // Same message either way, or the form becomes an admin-enumeration oracle.
    const a = await (await POST(req({ email: "real@admin.com", password: "nope" }))).json();
    const b = await (await POST(req({ email: "nobody@x.com", password: "nope" }))).json();
    expect(a.error).toBe(b.error);
  });

  it("prefers the named account when one actually matches", async () => {
    const bcrypt = await import("bcryptjs");
    prismaMock.user.findFirst.mockResolvedValue({
      id: "u1", name: "Anas", passwordHash: await bcrypt.default.hash("mypw", 4),
    });
    const res = await POST(req({ email: "anas@gg.net", password: "mypw" }));
    expect(res.status).toBe(200);
    expect(signMock).toHaveBeenCalledWith({ id: "u1", name: "Anas" });
  });
});
