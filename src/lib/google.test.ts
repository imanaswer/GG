import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock: any = {
    user: {
      // findFirst: the resolver's own lookups (they carry a deletedAt filter, so
      // they cannot be findUnique). findUnique: uniqueUsername's availability
      // probe, which is still keyed on the unique username column.
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  };
  return { prismaMock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { resolveGoogleUser, type GoogleProfile } from "./google";

const ROW = {
  id: "u1",
  email: "player@example.com",
  name: "Player One",
  username: "player",
  role: "player",
  avatarUrl: null,
};

const profile = (over: Partial<GoogleProfile> = {}): GoogleProfile => ({
  sub: "google-sub-0001",
  email: "player@example.com",
  emailVerified: true,
  name: "Player One",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findFirst.mockResolvedValue(null);
  prismaMock.user.findUnique.mockResolvedValue(null);
});

/**
 * Deletion is a soft delete: the row survives with its googleId intact unless
 * the DELETE handler clears it. These are the guards that keep "a soft-deleted
 * row is never a sign-in target" true even if a tombstone slips through — the
 * reported bug was signing back in as a deleted account and 404ing everywhere.
 */
describe("resolveGoogleUser and soft-deleted accounts", () => {
  it("scopes every lookup to rows that are not soft-deleted", async () => {
    prismaMock.user.create.mockResolvedValue(ROW);
    await resolveGoogleUser(profile());

    expect(prismaMock.user.findFirst).toHaveBeenCalled();
    for (const call of prismaMock.user.findFirst.mock.calls) {
      expect(call[0].where).toMatchObject({ deletedAt: null });
    }
  });

  it("creates a fresh account rather than reviving a tombstone", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null); // tombstone filtered out
    prismaMock.user.create.mockResolvedValue({ ...ROW, id: "u2" });

    expect(await resolveGoogleUser(profile())).toMatchObject({ id: "u2" });
    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
  });

  /**
   * The subtle one. googleId is @unique, so if a tombstone kept its identifier
   * the create above raises P2002 and the recovery path re-looks-up by googleId.
   * Unfiltered, that hands back the very tombstone we just refused to match and
   * the bug survives its own fix.
   */
  it("does not resurrect a tombstone through the P2002 recovery path", async () => {
    prismaMock.user.create.mockRejectedValue(Object.assign(new Error("dup"), { code: "P2002" }));
    await expect(resolveGoogleUser(profile())).rejects.toThrow();

    for (const call of prismaMock.user.findFirst.mock.calls) {
      expect(call[0].where).toMatchObject({ deletedAt: null });
    }
  });
});

describe("resolveGoogleUser lookup order", () => {
  it("matches on googleId first, before email", async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(ROW);

    expect(await resolveGoogleUser(profile())).toMatchObject({ id: "u1", username: "player" });
    expect(prismaMock.user.findFirst).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.findFirst.mock.calls[0][0].where).toEqual({
      googleId: "google-sub-0001",
      deletedAt: null,
    });
  });

  it("links an existing live email account rather than creating a duplicate", async () => {
    prismaMock.user.findFirst
      .mockResolvedValueOnce(null)                       // by googleId
      .mockResolvedValueOnce({ ...ROW, googleId: null }); // by email
    prismaMock.user.update.mockResolvedValue(ROW);

    await resolveGoogleUser(profile());

    expect(prismaMock.user.update.mock.calls[0][0].data.googleId).toBe("google-sub-0001");
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
});
