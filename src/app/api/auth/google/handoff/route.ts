import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  appRedirectUrl,
  isValidChallenge,
  issueCode,
  pruneExpiredCodes,
} from "@/lib/mobileHandoff";

export const runtime = "nodejs";

/**
 * Landing point for the mobile Google handoff (Developer PRD §5.2 — scope change).
 *
 * The app opens `/api/auth/google?redirect=/api/auth/google/handoff?c=<challenge>`. The existing web
 * flow runs untouched — same OAuth client, same callback, same cookie — and then lands here with a
 * live session. All this route does is convert that session into a one-time code and bounce it to
 * the app's URL scheme.
 *
 * Always a redirect, never JSON: the browser is mid-navigation and the only way back into the app
 * is a scheme redirect. Errors go to the app too, as `?error=`, so the app can close the tab and
 * show a message instead of leaving the user staring at a blank page.
 */
export async function GET(req: NextRequest) {
  const challenge = req.nextUrl.searchParams.get("c");
  if (!isValidChallenge(challenge)) {
    return NextResponse.redirect(appRedirectUrl({ error: "bad_request" }));
  }

  // The web callback set the session cookie immediately before redirecting here. No session means
  // the user arrived out of band — never mint a code for that.
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(appRedirectUrl({ error: "no_session" }));
  }

  await pruneExpiredCodes();
  const code = await issueCode(session.id, challenge);
  return NextResponse.redirect(appRedirectUrl({ code }));
}
