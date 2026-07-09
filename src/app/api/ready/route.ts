import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// Readiness: can we serve real traffic right now? Checks the one hard dependency
// — Postgres. Returns 503 (not 200) when the DB is unreachable so a load
// balancer drains this instance instead of routing failing requests to it.
export const dynamic = "force-dynamic";

// 5s: generous enough for a cold serverless pool connecting through pgbouncer
// (the first probe after a fresh boot), tight enough that a truly-down DB still
// yields a fast 503 instead of hanging the load balancer.
const DB_TIMEOUT_MS = 5000;

// A down DB can make a query hang effectively forever; a hanging readiness check
// is worse than a failing one (the LB times out instead of getting a clean 503).
// Race the probe against a short deadline.
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`db check timed out after ${ms}ms`)), ms);
  });
  // clearTimeout so a healthy probe doesn't leave a 5s timer dangling each poll.
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, DB_TIMEOUT_MS);
    return NextResponse.json({ ok: true, status: "ready", checks: { database: "up" }, ts: new Date().toISOString() }, { headers });
  } catch (e) {
    logger.error("readiness check failed", { err: e });
    return NextResponse.json(
      { ok: false, status: "not_ready", checks: { database: "down" }, ts: new Date().toISOString() },
      { status: 503, headers },
    );
  }
}
