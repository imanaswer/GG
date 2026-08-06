import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock: any = {
    mobileAuthCode: {
      create: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
  return { prismaMock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  appRedirectUrl,
  isValidChallenge,
  issueCode,
  redeemCode,
  sha256,
} from "./mobileHandoff";

const VERIFIER = "a".repeat(43);
const CHALLENGE = sha256(VERIFIER);

/** A row as the DB would hold it: hash only, never the raw code. */
const row = (over: Record<string, unknown> = {}) => ({
  id: "c1",
  codeHash: "irrelevant — findUnique is mocked",
  challenge: CHALLENGE,
  userId: "u1",
  expiresAt: new Date(Date.now() + 60_000),
  usedAt: null,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.mobileAuthCode.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.mobileAuthCode.deleteMany.mockResolvedValue({ count: 0 });
});

describe("appRedirectUrl", () => {
  it("builds the app scheme from config, never from caller input", () => {
    const url = appRedirectUrl({ code: "abc" });
    expect(url).toBe("ggredesign://auth-callback?code=abc");
  });

  it("honours MOBILE_APP_SCHEME", () => {
    process.env.MOBILE_APP_SCHEME = "ggother";
    expect(appRedirectUrl({ error: "no_session" })).toBe("ggother://auth-callback?error=no_session");
    delete process.env.MOBILE_APP_SCHEME;
  });
});

describe("isValidChallenge", () => {
  it("accepts base64url of a reasonable length", () => {
    expect(isValidChallenge(CHALLENGE)).toBe(true);
  });

  it.each([null, "", "short", "has spaces in it here", "has/slash+plus=padding"])(
    "rejects %j",
    (value) => {
      expect(isValidChallenge(value as string | null)).toBe(false);
    },
  );
});

describe("issueCode", () => {
  it("persists only the hash, and returns a code that is not what was stored", async () => {
    const code = await issueCode("u1", CHALLENGE);
    const { data } = prismaMock.mobileAuthCode.create.mock.calls[0][0];

    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(data.codeHash).not.toBe(code);
    expect(data.codeHash).toBe(sha256(code));
    expect(data.userId).toBe("u1");
    expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("redeemCode", () => {
  it("returns the user for a valid code + verifier", async () => {
    prismaMock.mobileAuthCode.findUnique.mockResolvedValue(row());
    expect(await redeemCode("raw", VERIFIER)).toEqual({ ok: true, userId: "u1" });
  });

  /** The point of the whole PKCE hop: intercepting the code off the URL scheme is not enough. */
  it("refuses a code presented with the wrong verifier", async () => {
    prismaMock.mobileAuthCode.findUnique.mockResolvedValue(row());
    expect(await redeemCode("raw", "b".repeat(43))).toEqual({ ok: false });
  });

  it("refuses an unknown code", async () => {
    prismaMock.mobileAuthCode.findUnique.mockResolvedValue(null);
    expect(await redeemCode("raw", VERIFIER)).toEqual({ ok: false });
    expect(prismaMock.mobileAuthCode.updateMany).not.toHaveBeenCalled();
  });

  it("refuses an expired code", async () => {
    prismaMock.mobileAuthCode.findUnique.mockResolvedValue(
      row({ expiresAt: new Date(Date.now() - 1) }),
    );
    expect(await redeemCode("raw", VERIFIER)).toEqual({ ok: false });
  });

  /** Replay guard: the burn is a guarded updateMany, so the loser of a race sees count 0. */
  it("refuses a code that was already burned", async () => {
    prismaMock.mobileAuthCode.findUnique.mockResolvedValue(row());
    prismaMock.mobileAuthCode.updateMany.mockResolvedValue({ count: 0 });
    expect(await redeemCode("raw", VERIFIER)).toEqual({ ok: false });
  });

  it("burns the code before validating, so a wrong verifier gets exactly one attempt", async () => {
    prismaMock.mobileAuthCode.findUnique.mockResolvedValue(row());
    await redeemCode("raw", "b".repeat(43));

    // Guarded on usedAt: null — that guard is what makes the burn atomic.
    const call = prismaMock.mobileAuthCode.updateMany.mock.calls[0][0];
    expect(call.where).toMatchObject({ id: "c1", usedAt: null });
    expect(call.data.usedAt).toBeInstanceOf(Date);
  });
});
