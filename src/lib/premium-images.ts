/**
 * Curated Unsplash photography for premium UI surfaces.
 *
 * All URLs point to the Unsplash CDN (whitelisted in next.config.ts).
 * Uses the `auto=format`/`q=80`/`fit=crop` params to let Unsplash serve
 * optimised WebP/AVIF at the requested width.
 *
 * Swap-out plan: when real shoot photography arrives, replace the `src`
 * values here and every consumer updates automatically.
 */

export type PremiumImage = {
  src: string;
  alt: string;
  credit: string;
};

const u = (id: string, w = 2000) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&q=80&w=${w}`;

// Hero — loose, atmospheric, low-contrast so 3D + type sit on top
export const HERO_BACKDROPS: PremiumImage[] = [
  { src: u("photo-1579952363873-27f3bade9f55"), alt: "Player sprinting on track", credit: "Unsplash / Braden Collum" },
  { src: u("photo-1461896836934-ffe607ba8211"), alt: "Basketball court at night", credit: "Unsplash / TJ Dragotta" },
];

// Sport-tile grid (landing sport picker)
export const SPORT_TILES: Record<string, PremiumImage> = {
  Basketball: { src: u("photo-1546519638-68e109498ffc", 1200), alt: "Basketball player mid-dunk", credit: "Unsplash / TJ Dragotta" },
  Football:   { src: u("photo-1517466787929-bc90951d0974", 1200), alt: "Footballer in motion", credit: "Unsplash / Jeffrey F Lin" },
  Cricket:    { src: u("photo-1531415074968-036ba1b575da", 1200), alt: "Cricket batsman", credit: "Unsplash / Alessandro Bogliari" },
  Badminton:  { src: u("photo-1626224583764-f87db24ac4ea", 1200), alt: "Badminton smash", credit: "Unsplash / Shubham Sharan" },
  Tennis:     { src: u("photo-1622279457486-62dcc4a431d6", 1200), alt: "Tennis serve close-up", credit: "Unsplash / Lucas Davies" },
  Volleyball: { src: u("photo-1592656094267-764a45160876", 1200), alt: "Volleyball spike", credit: "Unsplash / Vince Fleming" },
  Fitness:    { src: u("photo-1534438327276-14e5300c3a48", 1200), alt: "Athlete training", credit: "Unsplash / Victor Freitas" },
};

// Story sections — immersive full-bleed
export const STORY: Record<"learn" | "play" | "connect", PremiumImage> = {
  learn:   { src: u("photo-1526232761682-d26e03ac148e"), alt: "Coach mentoring young athlete", credit: "Unsplash / Clique Images" },
  play:    { src: u("photo-1517649763962-0c623066013b"), alt: "Pickup game in action", credit: "Unsplash / Jeffrey F Lin" },
  connect: { src: u("photo-1552879890-3a06dd3a06c2"), alt: "Team celebrating together", credit: "Unsplash / Nathan Shively" },
};

// Generic coach portraits (used when /api coach imageUrl is missing)
export const COACH_FALLBACKS: PremiumImage[] = [
  { src: u("photo-1552058544-f2b08422138a", 900), alt: "Coach portrait", credit: "Unsplash / Pablo Heimplatz" },
  { src: u("photo-1594381898411-846e7d193883", 900), alt: "Athletic trainer", credit: "Unsplash / Luis Vidal" },
  { src: u("photo-1571019613454-1cb2f99b2d8b", 900), alt: "Fitness instructor", credit: "Unsplash / Danielle Cerullo" },
  { src: u("photo-1541534401786-2077eed87a74", 900), alt: "Basketball coach", credit: "Unsplash / Ben Hershey" },
];

// Pickup game / event feel
export const GAME_FALLBACKS: PremiumImage[] = [
  { src: u("photo-1574629810360-7efbbe195018", 900), alt: "Evening pickup game", credit: "Unsplash / Ben Hershey" },
  { src: u("photo-1518091043644-c1d4457512c6", 900), alt: "Football match", credit: "Unsplash / Muyuan Ma" },
  { src: u("photo-1571019613454-1cb2f99b2d8b", 900), alt: "Court session", credit: "Unsplash / Danielle Cerullo" },
];

// Camp / event atmosphere
export const CAMP_IMAGE: PremiumImage = {
  src: u("photo-1526506118085-60ce8714f8c5"),
  alt: "Training camp", credit: "Unsplash / Tadeusz Lakota",
};
export const EVENT_IMAGE: PremiumImage = {
  src: u("photo-1540747913346-19e32dc3e97e"),
  alt: "Tournament night",credit: "Unsplash / Elianne Dipp",
};

export function pickFallback(list: PremiumImage[], seed: string): PremiumImage {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return list[Math.abs(h) % list.length];
}
