import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse, type NextRequest } from "next/server";

const url   = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

function make(limit: number, window: `${number} ${"s" | "m" | "h" | "d"}`, prefix: string): Limiter {
  if (redis) {
    const rl = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, window), analytics: false, prefix: `gg:${prefix}` });
    return async (id) => {
      const r = await rl.limit(id);
      return { success: r.success, limit: r.limit, remaining: r.remaining, reset: r.reset };
    };
  }
  return memoryLimiter(limit, parseWindow(window), prefix);
}

type Limiter = (id: string) => Promise<{ success: boolean; limit: number; remaining: number; reset: number }>;

function parseWindow(w: string): number {
  const [n, unit] = w.split(" ") as [string, "s" | "m" | "h" | "d"];
  const mult = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
  return Number(n) * mult;
}

const memoryStore = new Map<string, number[]>();
function memoryLimiter(limit: number, windowMs: number, prefix: string): Limiter {
  return async (id) => {
    const key = `${prefix}:${id}`;
    const now = Date.now();
    const cutoff = now - windowMs;
    const hits = (memoryStore.get(key) ?? []).filter(t => t > cutoff);
    if (hits.length >= limit) {
      return { success: false, limit, remaining: 0, reset: hits[0] + windowMs };
    }
    hits.push(now);
    memoryStore.set(key, hits);
    return { success: true, limit, remaining: limit - hits.length, reset: now + windowMs };
  };
}

export const authLimit     = make(5,   "1 m", "auth");
export const aiLimit       = make(10,  "1 h", "ai");
export const mutationLimit = make(100, "1 m", "mutation");

export function clientIp(req: NextRequest | Request): string {
  const h = (req as NextRequest).headers ?? (req as Request).headers;
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "anon";
}

export function tooManyRequests(result: { limit: number; remaining: number; reset: number }): NextResponse {
  const retryAfterSec = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return NextResponse.json(
    { ok: false, error: "Too many requests. Please slow down." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
      },
    },
  );
}
