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

// Story sections — immersive full-bleed
export const STORY: Record<"learn" | "play" | "connect", PremiumImage> = {
  learn:   { src: u("photo-1526232761682-d26e03ac148e"), alt: "Coach mentoring young athlete", credit: "Unsplash / Clique Images" },
  play:    { src: u("photo-1753443279716-b2aaadb7e08f"), alt: "Street cricket pickup game on a city road, India", credit: "Unsplash / Zoshua Colah" },
  connect: { src: u("photo-1552879890-3a06dd3a06c2"), alt: "Team celebrating together", credit: "Unsplash / Nathan Shively" },
};

// Landing "Pick your entry" hub cards — one well-matched image per lane.
// Decoupled from STORY/*_IMAGE so the landing grid can be tuned independently.
export const HUB_IMAGES: Record<"learn" | "play" | "events" | "camps" | "workshops", PremiumImage> = {
  learn:     { src: u("photo-1526232761682-d26e03ac148e"), alt: "Coach mentoring young athlete", credit: "Unsplash / Clique Images" },
  play:      { src: u("photo-1574629810360-7efbbe195018"), alt: "Evening pickup game", credit: "Unsplash / Ben Hershey" },
  events:    { src: u("photo-1531415074968-036ba1b575da"), alt: "Cricket batsman competing", credit: "Unsplash / Alessandro Bogliari" },
  camps:     { src: u("photo-1534438327276-14e5300c3a48"), alt: "Athletes training hard", credit: "Unsplash / Victor Freitas" },
  workshops: { src: u("photo-1571019613454-1cb2f99b2d8b"), alt: "Instructor leading a hands-on session", credit: "Unsplash / Danielle Cerullo" },
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
  src: u("photo-1643294358128-0d2da3b4ea7a"),
  alt: "Cricketer in full kit training on a ground in India", credit: "Unsplash",
};
export const EVENT_IMAGE: PremiumImage = {
  src: u("photo-1730739463889-34c7279277a9"),
  alt: "Packed cricket stadium during a match, India", credit: "Unsplash / Zoshua Colah",
};
export const WORKSHOP_IMAGE: PremiumImage = {
  src: u("photo-1722087642932-9b070e9a066e"),
  alt: "Badminton player leaping for a jump smash", credit: "Unsplash",
};

// Self-hosted pickup-game photography (public/sports/*.webp, 1200x900).
// Five frames per sport so two games of the same sport don't look identical,
// shot in Indian settings wherever the source library had them — street cricket,
// local grounds, club halls, neighbourhood gyms. Basketball and tennis are the
// thin ones: no reliably Indian frames existed, so those pools are generic
// action with no identifiable signage or architecture.
export const SPORT_FALLBACKS: Record<string, PremiumImage[]> = {
  Cricket:    [
    { src: "/sports/cricket-01.webp", alt: "Club cricketers in whites waiting to bat on a ground in India", credit: "Unsplash / Getty Images" },
    { src: "/sports/cricket-02.webp", alt: "Street cricket match on a Mumbai road", credit: "Unsplash / Zoshua Colah" },
    { src: "/sports/cricket-03.webp", alt: "Kids playing gully cricket in a lane", credit: "Unsplash / Simon Reza" },
    { src: "/sports/cricket-04.webp", alt: "Batsman facing up with the keeper behind the stumps", credit: "Unsplash / Getty Images" },
    { src: "/sports/cricket-05.webp", alt: "Net practice on a turf ground in India", credit: "Unsplash / Sandip Pandhare" },
  ],
  Football:   [
    { src: "/sports/football-01.webp", alt: "Footballers challenging for the ball in a local match in India", credit: "Unsplash / jebin ephrimraj" },
    { src: "/sports/football-02.webp", alt: "Player breaking away with the ball on a grass pitch", credit: "Unsplash / jebin ephrimraj" },
    { src: "/sports/football-03.webp", alt: "Boots and ball in a tussle on a grass pitch", credit: "Unsplash / Mustafa Fatemi" },
    { src: "/sports/football-04.webp", alt: "Two teams lined up before kickoff on a ground in India", credit: "Unsplash / aboodi vesakaran" },
    { src: "/sports/football-05.webp", alt: "Players seen through the goal net on a turf ground", credit: "Unsplash / Sagar Bhat" },
  ],
  Badminton:  [
    { src: "/sports/badminton-01.webp", alt: "Open-air badminton court ringed by coconut palms", credit: "Unsplash / Getty Images" },
    { src: "/sports/badminton-02.webp", alt: "Club badminton hall with several courts in play", credit: "Unsplash / Kayvie" },
    { src: "/sports/badminton-03.webp", alt: "Player lunging for a low return on a green court", credit: "Unsplash / Dmitriy Ignatenko" },
    { src: "/sports/badminton-04.webp", alt: "Jump smash mid-air", credit: "Unsplash / Irish83" },
    { src: "/sports/badminton-05.webp", alt: "Player stretching for a backhand return", credit: "Unsplash / Yoyo Hins Itta" },
  ],
  Basketball: [
    { src: "/sports/basketball-01.webp", alt: "Outdoor basketball hoop beside a building in India", credit: "Unsplash / Rutil Sharma" },
    { src: "/sports/basketball-02.webp", alt: "Empty outdoor court surrounded by tropical trees", credit: "Unsplash / Harsh Aryan" },
    { src: "/sports/basketball-03.webp", alt: "Basketball hoop silhouetted at sunset", credit: "Unsplash / Piyanshu Sharma" },
    { src: "/sports/basketball-04.webp", alt: "Evening pickup game on a court lined with palms", credit: "Unsplash / Ashwin Vaswani" },
    { src: "/sports/basketball-05.webp", alt: "Floodlit night game on an outdoor court", credit: "Unsplash / Christian Lue" },
  ],
  Volleyball: [
    { src: "/sports/volleyball-01.webp", alt: "Indoor volleyball match in India, spiker at the net", credit: "Unsplash / Vann" },
    { src: "/sports/volleyball-02.webp", alt: "Players scrambling for a dig during a local match in India", credit: "Unsplash / Daniel Pell" },
    { src: "/sports/volleyball-03.webp", alt: "Village volleyball team in orange kit before a match in India", credit: "Unsplash / Rahul Sharma" },
    { src: "/sports/volleyball-04.webp", alt: "Volleyball nets set up on a ground beside a monument in India", credit: "Unsplash / Mayank Singh" },
    { src: "/sports/volleyball-05.webp", alt: "Volleyball court at sunset under palm trees", credit: "Unsplash / Meet Gada" },
  ],
  Tennis:     [
    { src: "/sports/tennis-01.webp", alt: "Coach with a basket of balls at an indoor tennis court in India", credit: "Unsplash / Rezli" },
    { src: "/sports/tennis-02.webp", alt: "Player with a racket on a clay court", credit: "Unsplash / Rezli" },
    { src: "/sports/tennis-03.webp", alt: "Serve on a hard court", credit: "Unsplash / Andrew Heald" },
    { src: "/sports/tennis-04.webp", alt: "Player waiting to receive on a blue hard court", credit: "Unsplash / flou gaupr" },
    { src: "/sports/tennis-05.webp", alt: "Doubles rally on an outdoor court", credit: "Unsplash / J. Schiemann" },
  ],
  Fitness:    [
    { src: "/sports/fitness-01.webp", alt: "Group training session at a gym in India", credit: "Unsplash / Frederick Shaw" },
    { src: "/sports/fitness-02.webp", alt: "Lat pulldown at a gym in India", credit: "Unsplash / Gyan Shahane" },
    { src: "/sports/fitness-03.webp", alt: "Bench press set at a gym in India", credit: "Unsplash / Gyan Shahane" },
    { src: "/sports/fitness-04.webp", alt: "Trainer spotting a lift at a gym in India", credit: "Unsplash / Frederick Shaw" },
    { src: "/sports/fitness-05.webp", alt: "Group huddle at the end of a training session", credit: "Unsplash / Sum Sum" },
  ],
  Combat: [
    { src: "/sports/kickboxing-01.jpg", alt: "Cinematic close-up of kickboxing training in a gritty, high-end gym", credit: "Game Ground Exclusive" },
  ],
  TableTennis: [
    { src: "/sports/tabletennis-01.jpg", alt: "Dynamic cinematic shot of a table tennis match in a premium club", credit: "Game Ground Exclusive" },
  ],
};

export function pickFallback(list: PremiumImage[], seed: string): PremiumImage {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return list[Math.abs(h) % list.length];
}

/**
 * The image for a pickup game: sport-matched, and varied within the sport.
 * `seed` must be stable per game (the game id at render time, the slot id at
 * creation time) so a game keeps the same photo on every view.
 */
export function gameImage(sport: string | undefined | null, seed: string): PremiumImage {
  const normalizedSport = (sport || "").trim().toLowerCase().replace(/\s+/g, "");
  
  // Find matching key case-insensitively, ignoring spaces
  const match = Object.keys(SPORT_FALLBACKS).find(k => k.toLowerCase().replace(/\s+/g, "") === normalizedSport);
  
  // Special case mappings
  let fallbackKey = match;
  if (!match) {
    if (normalizedSport.includes("calisthenics") || normalizedSport.includes("gym") || normalizedSport.includes("fit")) {
      fallbackKey = "Fitness";
    } else if (normalizedSport.includes("box") || normalizedSport.includes("kick") || normalizedSport.includes("mma") || normalizedSport.includes("martial")) {
      fallbackKey = "Combat";
    }
  }

  return pickFallback(fallbackKey ? SPORT_FALLBACKS[fallbackKey] : GAME_FALLBACKS, seed);
}
