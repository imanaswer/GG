import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock: any = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  };
  return { prismaMock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { appleAudiences, appleConfigured, resolveAppleUser, type AppleProfile } from "./apple";

const ROW = {
  id: "u1",
  email: "player@example.com",
  name: "Player One",
  username: "player",
  role: "player",
  avatarUrl: null,
};

const profile = (over: Partial<AppleProfile> = {}): AppleProfile => ({
  sub: "000123.abc.0001",
  email: "player@example.com",
  emailVerified: true,
  isPrivateEmail: false,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findUnique.mockResolvedValue(null);
});

describe("appleConfigured", () => {
  it("is off when APPLE_BUNDLE_IDS is unset — an empty audience list must never verify", () => {
    delete process.env.APPLE_BUNDLE_IDS;
    expect(appleConfigured()).toBe(false);
    expect(appleAudiences()).toEqual([]);
  });

  it("splits and trims the comma-separated bundle ids", () => {
    process.env.APPLE_BUNDLE_IDS = "net.gameground.redesigned, net.gameground.redesigned.dev ,";
    expect(appleAudiences()).toEqual(["net.gameground.redesigned", "net.gameground.redesigned.dev"]);
    delete process.env.APPLE_BUNDLE_IDS;
  });
});

describe("resolveAppleUser", () => {
  it("matches on appleId first, before email", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(ROW);

    expect(await resolveAppleUser(profile())).toMatchObject({ id: "u1", username: "player" });
    // One lookup only — the email branch must not run.
    expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.findUnique.mock.calls[0][0].where).toEqual({ appleId: "000123.abc.0001" });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  /**
   * The whole point of keying on `sub`: a user who later hides their address, or whose relay
   * address changes, still lands on the same account instead of silently getting a second one.
   */
  it("logs in a known appleId even when Apple sends no email at all", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(ROW);
    expect(await resolveAppleUser(profile({ email: null }))).toMatchObject({ id: "u1" });
  });

  it("links an existing email account rather than creating a duplicate", async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce(null) // by appleId
      .mockResolvedValueOnce({ ...ROW, appleId: null }); // by email
    prismaMock.user.update.mockResolvedValue(ROW);

    await resolveAppleUser(profile());

    expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.update.mock.calls[0][0].data).toEqual({ appleId: "000123.abc.0001" });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("keeps an already-linked appleId instead of overwriting it", async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...ROW, appleId: "000123.abc.EXISTING" });
    prismaMock.user.update.mockResolvedValue(ROW);

    await resolveAppleUser(profile());

    expect(prismaMock.user.update.mock.calls[0][0].data.appleId).toBe("000123.abc.EXISTING");
  });

  it("creates a new user, persisting the first-authorization name Apple never repeats", async () => {
    prismaMock.user.create.mockResolvedValue(ROW);

    await resolveAppleUser(profile(), "Player One");

    const { data } = prismaMock.user.create.mock.calls[0][0];
    expect(data).toMatchObject({
      email: "player@example.com",
      name: "Player One",
      appleId: "000123.abc.0001",
      passwordHash: null,
      role: "player",
    });
  });

  it("falls back to the email local-part when Apple withholds the name", async () => {
    prismaMock.user.create.mockResolvedValue(ROW);
    await resolveAppleUser(profile(), null);
    expect(prismaMock.user.create.mock.calls[0][0].data.name).toBe("player");
  });

  it("refuses to create an account when Apple shares no email", async () => {
    await expect(resolveAppleUser(profile({ email: null }))).rejects.toThrow(/sign in with email/i);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  /** Auto-linking by email is only safe because the provider verified it. */
  it("refuses to link an unverified email", async () => {
    await expect(resolveAppleUser(profile({ emailVerified: false }))).rejects.toThrow(/not verified/i);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("re-resolves instead of 500ing when a concurrent request wins the create", async () => {
    prismaMock.user.create.mockRejectedValue(Object.assign(new Error("dup"), { code: "P2002" }));
    prismaMock.user.findUnique
      .mockResolvedValueOnce(null) // by appleId
      .mockResolvedValueOnce(null) // by email
      .mockResolvedValueOnce(null) // username availability check inside uniqueUsername
      .mockResolvedValueOnce(ROW); // post-race re-lookup by appleId

    expect(await resolveAppleUser(profile())).toMatchObject({ id: "u1" });
  });
});
