import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/logger";

type LimitResult = { success: boolean; limit: number; remaining: number; reset: number };

// Fail OPEN on any limiter-backend error. A Redis outage must degrade
// rate-limiting (briefly allow un-limited traffic), NOT take down auth and every
// write path — losing the protective layer for a minute beats a site-wide 500.
// Exported for testing.
export async function safeLimit(run: () => Promise<LimitResult>, fallbackLimit: number, prefix: string): Promise<LimitResult> {
  try {
    return await run();
  } catch (e) {
    logger.warn("ratelimit backend unavailable — failing open", { prefix, err: e });
    return { success: true, limit: fallbackLimit, remaining: fallbackLimit, reset: Date.now() };
  }
}

const url   = process.env.UPSTASH_REDIS_REST_TOKEN ? process.env.UPSTASH_REDIS_REST_URL : undefined;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

// Only build a real Redis client when the URL is a usable https endpoint.
// Placeholder values (e.g. the "https://..." from .env.example) must NOT throw
// at module load — they fall back to the in-memory limiter instead, otherwise
// any route behind middleware (including OAuth callbacks) 500s locally.
function isUsableUrl(u: string | undefined): u is string {
  if (!u) return false;
  try {
    const parsed = new URL(u);
    const labels = parsed.hostname.split(".");
    // Reject placeholder/dummy hostnames that will never resolve.
    const host = parsed.hostname.toLowerCase();
    if (host.includes("placeholder") || host.includes("example") || host === "localhost" || host.endsWith("...")) return false;
    return parsed.protocol === "https:" && labels.length >= 2 && labels.every(l => l.length > 0);
  } catch {
    return false;
  }
}

const redis = isUsableUrl(url) && token ? new Redis({ url, token }) : null;
// The in-memory fallback is per-lambda on Vercel — effectively no limit at all.
// Say so on every cold start rather than let brute-force protection vanish quietly.
if (!redis && process.env.NODE_ENV === "production") {
  logger.error("UPSTASH_REDIS_REST_URL/TOKEN not configured: rate limiting is per-instance memory only (auth brute-force protection is effectively off)");
}

function make(limit: number, window: `${number} ${"s" | "m" | "h" | "d"}`, prefix: string): Limiter {
  if (redis) {
    const rl = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, window), analytics: false, prefix: `gg:${prefix}` });
    // Wrap in safeLimit so an Upstash outage fails open instead of 500-ing every
    // rate-limited route (auth, mutations) through the proxy.
    return (id) => safeLimit(async () => {
      const r = await rl.limit(id);
      return { success: r.success, limit: r.limit, remaining: r.remaining, reset: r.reset };
    }, limit, prefix);
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
// Token refresh is machine-to-machine, not a credential-guessing surface: the
// token is 256 bits of CSPRNG output, so throttling it buys no brute-force
// protection. It IS bursty and per-IP — a dozen app users on one café or campus
// NAT all refreshing on app open would lock each other out at the login limit of
// 5/min. Still bounded, just at a level real traffic won't reach.
export const refreshLimit  = make(60,  "1 m", "refresh");
export const aiLimit       = make(10,  "1 h", "ai");
export const mutationLimit = make(100, "1 m", "mutation");
export const uploadLimit   = make(20,  "1 h", "upload");

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
