import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { handleErr, ApiError } from "./api";

async function body(res: Response) {
  return (await res.json()) as { ok: boolean; error?: string };
}

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
