// Universal Links (iOS) and App Links (Android) both work by the OS fetching a
// file from this domain and checking it names the app. Until then, tapping a
// gameground.net link in WhatsApp opens the browser instead of the app.
//
// The paths below are the ones the app has screens for. Everything else — the
// marketing pages, /api, the admin area — deliberately stays in the browser: an
// over-broad claim sends the user into an app that has nowhere to put them.

export const DEEP_LINK_PATHS = [
  "/game/*",
  "/play",
  "/coaches",
  "/coaches/*",
  "/camps",
  "/camps/*",
  "/events",
  "/events/*",
  "/workshops",
  "/workshops/*",
  "/profile/*",
  "/leaderboard",
] as const;

const list = (v: string | undefined) =>
  (v ?? "").split(",").map(s => s.trim()).filter(Boolean);

/**
 * Apple requires TEAMID.bundleid. APPLE_BUNDLE_IDS is the same variable Sign in
 * with Apple uses, so the two can't disagree about which app this is.
 */
export function appleAppIds(): string[] {
  const team = process.env.APPLE_TEAM_ID?.trim();
  const bundles = list(process.env.APPLE_BUNDLE_IDS);
  if (!team || bundles.length === 0) return [];
  return bundles.map(b => `${team}.${b}`);
}

export function androidTargets(): { package_name: string; sha256_cert_fingerprints: string[] }[] {
  const pkg = process.env.ANDROID_PACKAGE_NAME?.trim();
  const fingerprints = list(process.env.ANDROID_CERT_SHA256);
  if (!pkg || fingerprints.length === 0) return [];
  return [{ package_name: pkg, sha256_cert_fingerprints: fingerprints }];
}

export function appleAppSiteAssociation(appIDs: string[]) {
  return {
    applinks: {
      details: [{
        appIDs,
        components: [
          // Explicitly exclude the API before claiming anything else — a link the
          // app intercepts and cannot render is worse than one that opens Safari.
          { "/": "/api/*", exclude: true, comment: "API responses are not app screens" },
          { "/": "/admin/*", exclude: true, comment: "admin is web-only" },
          ...DEEP_LINK_PATHS.map(p => ({ "/": p })),
        ],
      }],
    },
    // Deliberately no "webcredentials": password autofill is a separate claim and
    // asserting it without the app's entitlement produces a silent mismatch.
  };
}

export function assetLinks(targets: ReturnType<typeof androidTargets>) {
  return targets.map(target => ({
    relation: ["delegate_permission/common.handle_all_urls"],
    target: { namespace: "android_app", ...target },
  }));
}
