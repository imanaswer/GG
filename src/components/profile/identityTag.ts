import type { UserProfile } from "@/hooks/useData";

export type IdentityTag = { label: string; color: string };

const TAGS = {
  veteran:    { label: "Veteran",              color: "#a78bfa" },
  organizer:  { label: "Community Builder",    color: "#22d3ee" },
  reliable:   { label: "Reliable Regular",     color: "#4ade80" },
  multiSport: { label: "Multi-Sport Explorer", color: "#fbbf24" },
  rising:     { label: "Rising Star",          color: "#f97316" },
  player:     { label: "New Player",           color: "#94a3b8" },
};

export function pickIdentityTag(profile: UserProfile): IdentityTag {
  const sportsCount = profile.sports?.length ?? 0;
  const created = new Date(profile.createdAt);
  const ageMonths = Math.max(0, (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 30.4375));

  if (profile.gamesPlayed >= 50) return TAGS.veteran;
  if (profile.gamesOrganized >= 5) return TAGS.organizer;
  if (profile.attendanceRate >= 90 && profile.gamesPlayed >= 10) return TAGS.reliable;
  if (sportsCount >= 3) return TAGS.multiSport;
  if (ageMonths < 2 && profile.gamesPlayed >= 3) return TAGS.rising;

  if (profile.sports?.[0]) {
    return { label: `${profile.sports[0].sport} Player`, color: "#e63946" };
  }
  return TAGS.player;
}
