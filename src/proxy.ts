import { NextResponse, type NextRequest } from "next/server";
import { authLimit, mutationLimit, clientIp, tooManyRequests } from "@/lib/ratelimit";
import { COOKIE as AUTH_COOKIE, verifyToken } from "@/lib/auth";

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

  const ip = clientIp(req);

  if (AUTH_PATHS.has(pathname)) {
    const r = await authLimit(ip);
    if (!r.success) return tooManyRequests(r);
    return NextResponse.next();
  }

  if (pathname === "/api/ai/recommend") return NextResponse.next();

  // Razorpay webhooks come from Razorpay's IPs and are signed; never rate-limit them.
  if (pathname === "/api/payments/webhook") return NextResponse.next();

  if (MUTATION_METHODS.has(req.method)) {
    const r = await mutationLimit(ip);
    if (!r.success) return tooManyRequests(r);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/profile/edit/:path*",
    "/create-game/:path*",
    "/coach/dashboard/:path*",
    "/coach/profile/edit/:path*",
  ],
};
