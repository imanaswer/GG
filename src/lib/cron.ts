/**
 * The one auth check for every /api/cron route.
 *
 * Six routes carried a byte-identical copy of this, and the copy had a hole: an
 * UNSET CRON_SECRET makes the template literal `Bearer undefined`, which no
 * caller can ever match, so a misconfigured deployment returned exactly the same
 * 401 as a wrong caller. Every scheduled job then failed identically and there
 * was nothing in the response to say which side was broken — the GitHub secret
 * or the Vercel env var.
 *
 * Unset now answers 503 with a distinct message. It still refuses (never run a
 * job for an unauthenticated caller), but the failure names itself.
 */
export function cronUnauthorized(req: Request): Response | null {
  // Outside production the routes stay open so `curl localhost` works in dev —
  // unchanged, six routes rely on it.
  if (process.env.NODE_ENV !== "production") return null;

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response("Cron secret not configured on the server", { status: 503 });
  }

  return req.headers.get("authorization") === `Bearer ${secret}`
    ? null
    : new Response("Unauthorized", { status: 401 });
}
