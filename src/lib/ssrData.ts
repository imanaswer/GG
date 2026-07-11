import { NextRequest } from "next/server";

/**
 * Call an API route's GET handler in-process from a server component, so SSR
 * pages reuse the exact listing/detail logic (filters, derived status, sort)
 * with zero duplication. The synthetic request carries no cookies, so handlers
 * always see an anonymous session — no personal data leaks into cached HTML.
 * Returns undefined on any failure (e.g. no DB at build time); the client
 * component then fetches on mount exactly as it did before SSR.
 */
export async function ssrGet<T>(
  // Promise<never> keeps any concrete route ctx (e.g. { id: string }) assignable.
  handler: (req: NextRequest, ctx: { params: Promise<never> }) => Promise<Response>,
  path: string,
  params?: Record<string, string>,
): Promise<T | undefined> {
  try {
    const req = new NextRequest(`http://ssr.internal${path}`);
    const res = await handler(req, { params: Promise.resolve(params ?? {}) as Promise<never> });
    const body = await res.json();
    return body?.ok ? (body.data as T) : undefined;
  } catch {
    return undefined;
  }
}
