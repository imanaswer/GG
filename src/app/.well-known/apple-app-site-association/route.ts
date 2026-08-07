import { appleAppIds, appleAppSiteAssociation } from "@/lib/deepLinks";

// Served from a Route Handler rather than public/ so the app id comes from the
// environment. iOS fetches this over HTTPS with no redirects allowed and expects
// application/json — note the file itself has no .json extension, which is why a
// static file would be served as octet-stream and silently rejected.
export const dynamic = "force-dynamic";

export async function GET() {
  const appIDs = appleAppIds();

  // 404 rather than an empty or placeholder document. iOS and Apple's CDN cache
  // this aggressively, so publishing a file that names no app — or names the
  // wrong one — breaks Universal Links for longer than not publishing at all.
  if (appIDs.length === 0) {
    return new Response("Not configured: set APPLE_TEAM_ID and APPLE_BUNDLE_IDS", { status: 404 });
  }

  return new Response(JSON.stringify(appleAppSiteAssociation(appIDs), null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
