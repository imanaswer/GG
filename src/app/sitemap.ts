import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/siteUrl";

// Regenerate the sitemap at most once an hour so we don't need DB access at
// build time and don't hammer the DB on every crawl.
export const revalidate = 3600;

type Entry = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  // Public, crawlable pages. Auth-gated/personal pages (profile, bookings,
  // create-game, onboarding-terms, offline) and the admin/coach dashboards are
  // intentionally excluded.
  const staticRoutes: Entry[] = ([
    { path: "", priority: 1.0, changeFrequency: "weekly" },
    { path: "/play", priority: 0.9, changeFrequency: "daily" },
    { path: "/learn", priority: 0.9, changeFrequency: "weekly" },
    { path: "/events", priority: 0.9, changeFrequency: "daily" },
    { path: "/camps", priority: 0.8, changeFrequency: "weekly" },
    { path: "/workshops", priority: 0.8, changeFrequency: "weekly" },
    { path: "/leaderboard", priority: 0.6, changeFrequency: "daily" },
    { path: "/about", priority: 0.5, changeFrequency: "monthly" },
    { path: "/search", priority: 0.4, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  ] as const).map(({ path, priority, changeFrequency }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  // Dynamic detail pages for live, publicly listed content. Filters mirror the
  // listing APIs so we never expose drafts/closed/cancelled entities. Wrapped in
  // try/catch so a DB hiccup degrades to the static sitemap instead of a 500.
  let dynamicRoutes: Entry[] = [];
  try {
    const [coaches, events, camps, workshops] = await Promise.all([
      prisma.coach.findMany({
        where: { status: "active" },
        select: { id: true, updatedAt: true },
      }),
      prisma.sportEvent.findMany({
        where: { published: true, status: { notIn: ["Completed", "Archived", "Cancelled"] } },
        select: { id: true, createdAt: true },
      }),
      prisma.camp.findMany({
        where: { status: { notIn: ["completed", "archived", "closed"] } },
        select: { id: true, createdAt: true },
      }),
      prisma.workshop.findMany({
        where: { status: { notIn: ["completed", "archived", "closed"] } },
        select: { id: true, updatedAt: true },
      }),
    ]);

    const toEntry = (
      segment: string,
      rows: { id: string; lastModified: Date }[],
      priority: number,
    ): Entry[] =>
      rows.map((row) => ({
        url: `${base}/${segment}/${row.id}`,
        lastModified: row.lastModified,
        changeFrequency: "weekly",
        priority,
      }));

    dynamicRoutes = [
      ...toEntry("coach", coaches.map((c) => ({ id: c.id, lastModified: c.updatedAt })), 0.7),
      ...toEntry("events", events.map((e) => ({ id: e.id, lastModified: e.createdAt })), 0.7),
      ...toEntry("camps", camps.map((c) => ({ id: c.id, lastModified: c.createdAt })), 0.6),
      ...toEntry("workshops", workshops.map((w) => ({ id: w.id, lastModified: w.updatedAt })), 0.6),
    ];
  } catch (err) {
    console.error("[sitemap] failed to load dynamic routes:", err);
  }

  return [...staticRoutes, ...dynamicRoutes];
}
