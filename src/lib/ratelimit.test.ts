import { describe, it, expect } from "vitest";
import { safeLimit } from "./ratelimit";

describe("safeLimit — DR: Redis outage must fail OPEN", () => {
  it("allows the request when the limiter backend throws (Redis down)", async () => {
    const r = await safeLimit(async () => { throw new Error("ECONNREFUSED upstash"); }, 100, "mutation");
    expect(r.success).toBe(true); // fail-open: availability > rate-limiting
    expect(r.limit).toBe(100);
  });

  it("passes a real limiter result through unchanged (including a block)", async () => {
    const blocked = { success: false, limit: 5, remaining: 0, reset: 123 };
    const r = await safeLimit(async () => blocked, 5, "auth");
    expect(r).toEqual(blocked); // when Redis is healthy, real limits still enforced
  });
});
