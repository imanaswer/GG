import { NextRequest, NextResponse } from "next/server";
import { buildAuthUrl, googleConfigured, STATE_COOKIE } from "@/lib/google";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_unconfigured", req.nextUrl.origin));
  }

  // Pack a CSRF nonce together with the post-login redirect target into one
  // signed-by-secrecy state value. The httpOnly cookie holds the same value so
  // the callback can verify it was us who started the flow.
  const nonce = crypto.randomUUID();
  const redirect = req.nextUrl.searchParams.get("redirect") || "/";
  const state = `${nonce}:${encodeURIComponent(redirect)}`;

  const res = NextResponse.redirect(buildAuthUrl(state, req.nextUrl.origin));
  res.cookies.set({
    name: STATE_COOKIE,
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });
  return res;
}
