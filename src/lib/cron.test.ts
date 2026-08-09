import { describe, it, expect, afterEach, vi } from "vitest";
import { cronUnauthorized } from "./cron";

const req = (auth?: string) =>
  new Request("https://example.test/api/cron/x", { headers: auth ? { authorization: auth } : {} });

afterEach(() => {
  vi.unstubAllEnvs();
});

const production = () => vi.stubEnv("NODE_ENV", "production");

describe("cronUnauthorized", () => {
  it("503s when CRON_SECRET is unset — the misconfiguration must not look like a wrong caller", () => {
    production();
    vi.stubEnv("CRON_SECRET", "");
    const res = cronUnauthorized(req("Bearer anything"));
    expect(res?.status).toBe(503);
  });

  it("401s a wrong or missing bearer", () => {
    production();
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(cronUnauthorized(req("Bearer wrong"))?.status).toBe(401);
    expect(cronUnauthorized(req())?.status).toBe(401);
  });

  it("lets the right bearer through", () => {
    production();
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(cronUnauthorized(req("Bearer s3cret"))).toBeNull();
  });

  it("stays open outside production so local curl works", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("CRON_SECRET", "");
    expect(cronUnauthorized(req())).toBeNull();
  });
});
