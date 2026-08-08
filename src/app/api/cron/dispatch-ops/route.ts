import { NextRequest } from "next/server";
import { ok } from "@/lib/api";
import { dispatchPending } from "@/lib/ops";

export const maxDuration = 60;

/**
 * Drains the ops event outbox. This is the retry mechanism: anything whose delivery
 * failed — or which was never attempted because the request that logged it ended
 * first — goes out here.
 *
 * Scheduled hourly from .github/workflows/cron-hourly.yml, NOT vercel.json: on the
 * Hobby plan a sub-daily entry in vercel.json makes Vercel create no deployment at
 * all, so production silently freezes on the last good build.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.NODE_ENV === "production" && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { sent, failed } = await dispatchPending();
  return ok({ sent, failed });
}
