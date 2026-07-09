import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { handleErr, ApiError, okCached } from "./api";

async function body(res: Response) {
  return (await res.json()) as { ok: boolean; error?: string };
}

describe("okCached", () => {
  it("emits a public, shared-edge Cache-Control with s-maxage + swr", () => {
    const res = okCached({ x: 1 }, 60);
    const cc = res.headers.get("cache-control") ?? "";
    // "public" is load-bearing: it authorizes shared-CDN caching. Must never be
    // "private"/"no-store" here, and this helper must only wrap public data.
    expect(cc).toContain("public");
    expect(cc).toContain("s-maxage=60");
    expect(cc).toContain("stale-while-revalidate=300"); // default swr = 5×
  });

  it("honors a custom swr", () => {
    const cc = okCached({}, 15, 45).headers.get("cache-control") ?? "";
    expect(cc).toContain("s-maxage=15");
    expect(cc).toContain("stale-while-revalidate=45");
  });
});

describe("handleErr", () => {
  it("passes an ApiError's userMessage and status through", async () => {
    const res = handleErr(new ApiError("This game has already started.", 400));
    expect(res.status).toBe(400);
    expect(await body(res)).toMatchObject({ ok: false, error: "This game has already started." });
  });

  it("never echoes a raw Prisma error message", async () => {
    const raw = new Prisma.PrismaClientKnownRequestError(
      "Null constraint violation on the fields: (`userId`)",
      { code: "P2011", clientVersion: "7.0.0" },
    );
    const res = handleErr(raw);
    const j = await body(res);
    expect(j.ok).toBe(false);
    expect(j.error).toBe("Missing required information.");
    expect(j.error).not.toContain("prisma");
    expect(j.error).not.toContain("constraint");
  });

  it("maps P2025 (not found)", async () => {
    const raw = new Prisma.PrismaClientKnownRequestError("Record not found", { code: "P2025", clientVersion: "7.0.0" });
    expect((await body(handleErr(raw))).error).toBe("The requested item no longer exists.");
  });

  it("returns a generic message for an unexpected Error (no raw message)", async () => {
    const res = handleErr(new Error("connect ECONNREFUSED 127.0.0.1:5432"));
    const j = await body(res);
    expect(res.status).toBe(500);
    expect(j.error).toBe("Something went wrong. Please try again.");
    expect(j.error).not.toContain("ECONNREFUSED");
  });
});
