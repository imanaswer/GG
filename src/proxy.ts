import { NextResponse, type NextRequest } from "next/server";
import { authLimit, mutationLimit, clientIp, tooManyRequests } from "@/lib/ratelimit";
import { COOKIE as AUTH_COOKIE, verifyToken } from "@/lib/auth";
import { verifyAdminToken } from "@/lib/adminAuth";

const ADMIN_COOKIE = "gg_admin";

const AUTH_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
]);

const MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

// Pages that require an authenticated player/coach session.
const PROTECTED_PAGE_PATTERNS: RegExp[] = [
  /^\/profile\/edit(\/|$)/,
  /^\/create-game(\/|$)/,
  /^\/coach\/dashboard(\/|$)/,
  /^\/coach\/profile\/edit(\/|$)/,
];

function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PAGE_PATTERNS.some((re) => re.test(pathname));
}

async function requireSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return false;
  const session = await verifyToken(token);
  return !!session;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin page gate — server-side, so admin HTML is never served to non-admins
  // (client AdminGuard alone is bypassable). /admin/login stays public.
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    if (!token || !(await verifyAdminToken(token))) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Page-level auth gate — redirect to /login with a return URL.
  if (isProtectedPage(pathname)) {
    if (await requireSession(req)) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?redirect=${encodeURIComponent(pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  // API rate limiting below.
  if (!pathname.startsWith("/api/")) return NextResponse.next();

  // Correlation id: reuse an inbound one (from an upstream proxy) or mint one.
  // Injected into the request headers so any handler can read it via
  // req.headers.get("x-request-id"), and echoed on the response so clients and
  // uptime monitors can quote it in support/incident reports. (On Vercel,
  // x-vercel-id is the platform-native request id in their log drain.)
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const apiPass = () => {
    const headers = new Headers(req.headers);
    headers.set("x-request-id", requestId);
    const res = NextResponse.next({ request: { headers } });
    res.headers.set("x-request-id", requestId);
    return res;
  };

  const ip = clientIp(req);

  if (AUTH_PATHS.has(pathname)) {
    const r = await authLimit(ip);
    if (!r.success) return tooManyRequests(r);
    return apiPass();
  }

  if (pathname === "/api/ai/recommend") return apiPass();

  // Razorpay webhooks come from Razorpay's IPs and are signed; never rate-limit them.
  if (pathname === "/api/payments/webhook") return apiPass();

  if (MUTATION_METHODS.has(req.method)) {
    const r = await mutationLimit(ip);
    if (!r.success) return tooManyRequests(r);
  }

  return apiPass();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/admin",
    "/admin/:path*",
    "/profile/edit/:path*",
    "/create-game/:path*",
    "/coach/dashboard/:path*",
    "/coach/profile/edit/:path*",
  ],
};
