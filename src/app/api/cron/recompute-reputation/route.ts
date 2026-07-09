import { NextRequest } from "next/server";
import { ok } from "@/lib/api";
import { recomputeAll } from "@/lib/reputationService";
import { logger } from "@/lib/logger";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.NODE_ENV === "production" && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const start = Date.now();
  try {
    const { processed, promoted } = await recomputeAll();
    const elapsedMs = Date.now() - start;
    return ok({
      checkedAt: new Date().toISOString(),
      processed,
      promoted,
      elapsedMs,
    });
  } catch (err) {
    logger.error("cron/recompute-reputation failed", { err });
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
