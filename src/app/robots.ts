import type { MetadataRoute } from "next";

/** Normalize NEXT_PUBLIC_APP_URL (may lack a scheme / have a trailing slash). */
function baseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.gameground.net").trim();
  const withScheme = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, "");
}

export default function robots(): MetadataRoute.Robots {
  const base = baseUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep private/personal and non-content routes out of the index.
      disallow: [
        "/admin",
        "/api",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/profile",
        "/bookings",
        "/create-game",
        "/onboarding-terms",
        "/coach/dashboard",
        "/coach/profile",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
