import { androidTargets, assetLinks } from "@/lib/deepLinks";

// Android App Links verification. The SHA-256 fingerprint must be the one from
// the RELEASE signing key (`eas credentials`) — a debug-key fingerprint verifies
// nothing for an installed store build.
export const dynamic = "force-dynamic";

export async function GET() {
  const targets = androidTargets();

  if (targets.length === 0) {
    return new Response("Not configured: set ANDROID_PACKAGE_NAME and ANDROID_CERT_SHA256", { status: 404 });
  }

  return new Response(JSON.stringify(assetLinks(targets), null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
