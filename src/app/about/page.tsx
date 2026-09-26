import { AboutClient } from "./AboutClient";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "About Game Ground — Kozhikode's Sports Platform",
  description: "How Game Ground makes sports as accessible as ordering a ride — hyperlocal, coach-verified, and Built for Keralam.",
};

export const revalidate = 3600; // Cache for 1 hour

export default async function About() {
  const [players, coaches, games] = await Promise.all([
    prisma.user.count(),
    prisma.coach.count(),
    prisma.game.count(),
  ]);

  const stats = {
    players: Math.max(500, players),
    coaches: Math.max(50, coaches),
    games: Math.max(200, games),
    sports: 15
  };

  return <AboutClient initialStats={stats} />;
}
