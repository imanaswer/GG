import { NextRequest, NextResponse } from "next/server";
import { signToken, cookieOpts } from "@/lib/auth";
import { fetchGoogleProfile, resolveGoogleUser, STATE_COOKIE } from "@/lib/google";

export const runtime = "nodejs";

/** Safe internal redirect target: resolve against our origin and keep only same-origin paths.
 *  Guards against open redirects including backslash tricks (`/\evil.com` → `//evil.com`). */
function safeRedirect(target: string, origin: string): string {
  try {
    const u = new URL(target, origin);
    return u.origin === origin ? u.pathname + u.search : "/";
  } catch {
    return "/";
  }
}

function loginError(origin: string, code: string) {
  return NextResponse.redirect(new URL(`/login?error=${code}`, origin));
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const params = req.nextUrl.searchParams;

  // Google reports user-denied consent etc. via ?error=
  if (params.get("error")) return loginError(origin, "google_denied");

  const code = params.get("code");
  const state = params.get("state");
  const cookieState = req.cookies.get(STATE_COOKIE)?.value;

  // CSRF guard: the state echoed back by Google must match our httpOnly cookie.
  if (!code || !state || !cookieState || state !== cookieState) {
    return loginError(origin, "google_state");
  }

  const redirect = safeRedirect(decodeURIComponent(state.split(":").slice(1).join(":") || "/"), origin);

  try {
    const profile = await fetchGoogleProfile(code, origin);

    // The hinge that makes auto-linking by email safe.
    if (!profile.emailVerified) return loginError(origin, "google_unverified");

    const sessionUser = await resolveGoogleUser(profile);
    const token = await signToken(sessionUser);

    const res = NextResponse.redirect(new URL(redirect, origin));
    res.cookies.set(cookieOpts(token));
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch {
    return loginError(origin, "google_failed");
  }
}
