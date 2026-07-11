import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "Player Leaderboard — Kozhikode Sports Rankings",
  "See the top-ranked players on Game Ground, Kozhikode (Calicut)'s sports community. Earn points by playing games, joining events and training with coaches.",
  "/leaderboard",
);

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
