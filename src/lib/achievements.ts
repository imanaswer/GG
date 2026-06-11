import { TIERS, type Tier } from "@/lib/reputation";

export const ACHIEVEMENT_CATEGORIES = ["sports", "consistency", "community", "competition"] as const;
export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];

export interface AchievementStats {
  gamesPlayed: number;
  gamesOrganized: number;
  attendanceRate: number;
  streakWeeks: number;
  tier: string;
}

export interface Achievement {
  id: string;
  category: AchievementCategory;
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress?: { current: number; target: number };
  season?: string; // reserved for future seasonal achievements
}

type Def = {
  id: string; category: AchievementCategory; icon: string; title: string; description: string;
  eval: (s: AchievementStats) => { current: number; target: number };
};

const tierIndex = (t: string) => Math.max(0, TIERS.indexOf(t as Tier));

const DEFS: Def[] = [
  { id: "first-match", category: "sports", icon: "🏅", title: "First Match", description: "Play your first pickup game",
    eval: s => ({ current: s.gamesPlayed, target: 1 }) },
  { id: "regular", category: "sports", icon: "⚽", title: "Regular", description: "Join 10 games",
    eval: s => ({ current: s.gamesPlayed, target: 10 }) },
  { id: "veteran", category: "sports", icon: "🎽", title: "Veteran", description: "Join 50 games",
    eval: s => ({ current: s.gamesPlayed, target: 50 }) },
  { id: "organiser", category: "sports", icon: "🎯", title: "Organiser", description: "Organise your first game",
    eval: s => ({ current: s.gamesOrganized, target: 1 }) },
  { id: "streak-4", category: "consistency", icon: "🔥", title: "4-Week Streak", description: "Play in 4 consecutive weeks",
    eval: s => ({ current: s.streakWeeks, target: 4 }) },
  { id: "streak-12", category: "consistency", icon: "🔥", title: "12-Week Streak", description: "Play in 12 consecutive weeks",
    eval: s => ({ current: s.streakWeeks, target: 12 }) },
  { id: "reliable", category: "consistency", icon: "💯", title: "Reliable", description: "Keep a 95%+ attendance rate",
    eval: s => ({ current: Math.round(s.attendanceRate), target: 95 }) },
  { id: "team-player", category: "community", icon: "🤝", title: "Team Player", description: "Join 5 games with others",
    eval: s => ({ current: s.gamesPlayed, target: 5 }) },
  { id: "connector", category: "community", icon: "📣", title: "Connector", description: "Organise 3 games",
    eval: s => ({ current: s.gamesOrganized, target: 3 }) },
  { id: "tier-bronze", category: "competition", icon: "🥉", title: "Bronze Tier", description: "Reach Bronze",
    eval: s => ({ current: tierIndex(s.tier) >= 0 ? 1 : 0, target: 1 }) },
  { id: "tier-silver", category: "competition", icon: "🥈", title: "Silver Tier", description: "Reach Silver",
    eval: s => ({ current: tierIndex(s.tier) >= 1 ? 1 : 0, target: 1 }) },
  { id: "tier-gold", category: "competition", icon: "🥇", title: "Gold Tier", description: "Reach Gold",
    eval: s => ({ current: tierIndex(s.tier) >= 2 ? 1 : 0, target: 1 }) },
  { id: "tier-elite", category: "competition", icon: "💎", title: "Elite Tier", description: "Reach Elite",
    eval: s => ({ current: tierIndex(s.tier) >= 3 ? 1 : 0, target: 1 }) },
  { id: "tier-pro", category: "competition", icon: "👑", title: "Pro Tier", description: "Reach Pro",
    eval: s => ({ current: tierIndex(s.tier) >= 4 ? 1 : 0, target: 1 }) },
];

export function computeAchievements(stats: AchievementStats): Achievement[] {
  return DEFS.map(d => {
    const { current, target } = d.eval(stats);
    const unlocked = current >= target;
    return {
      id: d.id, category: d.category, icon: d.icon, title: d.title, description: d.description,
      unlocked,
      progress: unlocked ? undefined : { current: Math.min(current, target), target },
    };
  });
}
