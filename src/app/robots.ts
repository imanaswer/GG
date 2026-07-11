import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
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
        "/game", // pickup games are ephemeral; pages have no metadata and soft-404 on bad ids
        "/onboarding-terms",
        "/coach/dashboard",
        "/coach/profile",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
