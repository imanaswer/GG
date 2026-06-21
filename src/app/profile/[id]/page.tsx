"use client";
import { use, useState, useMemo } from "react";
import Link from "next/link";
import { PremiumNav } from "@/components/premium/PremiumNav";
import { useUserProfile, useUserActivity } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { tierLevelInfo } from "@/lib/reputation";
import { computeAchievements } from "@/lib/achievements";
import { motivationFor } from "@/lib/motivation";
import { PlayerHeroCard } from "@/components/profile/PlayerHeroCard";
import { RankProgress } from "@/components/profile/RankProgress";
import { StatStrip } from "@/components/profile/StatStrip";
import { SeasonStrip } from "@/components/profile/SeasonStrip";
import { UpcomingCard } from "@/components/profile/UpcomingCard";
import { ProfileCompletionCard } from "@/components/profile/ProfileCompletionCard";
import { ActivityTimeline } from "@/components/profile/ActivityTimeline";
import { AchievementsRail } from "@/components/profile/AchievementsRail";
import { MotivationCard } from "@/components/profile/MotivationCard";
import { GamesTab } from "@/components/profile/GamesTab";
import { BookingsTab } from "@/components/profile/BookingsTab";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { TierUpBanner } from "@/components/profile/TierUpBanner";

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const isOwn = user?.id === id;
  const { data: profile, isLoading, error } = useUserProfile(id);
  const { data: activity } = useUserActivity(id);
  const streakWeeks = activity?.streakWeeks ?? 0;

  const tabs = isOwn
    ? ["Overview", "Games", "Bookings", "Achievements", "Settings"]
    : ["Overview", "Games", "Achievements"];
  const [tab, setTab] = useState("Overview");

  const achievements = useMemo(() => profile ? computeAchievements({
    gamesPlayed: profile.gamesPlayed, gamesOrganized: profile.gamesOrganized,
    attendanceRate: profile.attendanceRate, streakWeeks, tier: profile.tier,
  }) : [], [profile, streakWeeks]);

  if (isLoading) return <><PremiumNav variant="solid" /><Center>Loading profile…</Center></>;
  if (error || !profile) return <><PremiumNav variant="solid" /><Center>Profile not found.</Center></>;

  const info = tierLevelInfo(profile.reputationScore);
  const nearestLocked = achievements
    .filter(a => !a.unlocked && a.progress && ["first-match", "regular", "veteran", "team-player"].includes(a.id))
    .sort((a, b) => (a.progress!.target - a.progress!.current) - (b.progress!.target - b.progress!.current))[0];
  const motivation = motivationFor({
    pointsToNext: info.next?.pointsToNext ?? 0,
    nextTierLabel: info.next?.label ?? null,
    streakWeeks,
    nearestLocked: nearestLocked ? { title: nearestLocked.title, current: nearestLocked.progress!.current, target: nearestLocked.progress!.target } : null,
    topSport: profile.sportActivity[0]?.sport ?? null,
  });

  return (
    <>
      <PremiumNav variant="solid" />
      <main style={{ background: "#050505", minHeight: "100vh", paddingTop: 96, paddingBottom: 80 }}>
        <div className="container-lg" style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 760, margin: "0 auto", padding: "0 16px" }}>
          <PlayerHeroCard
            name={profile.name} username={profile.username} avatarUrl={profile.avatarUrl}
            tier={profile.tier} reputationScore={profile.reputationScore} rank={profile.playerRank}
            streakWeeks={streakWeeks} joinedAt={profile.createdAt} favoriteSport={profile.sportActivity[0]?.sport}
          />
          {isOwn && <TierUpBanner tier={profile.tier} tierUpdatedAt={profile.tierUpdatedAt} isOwn={isOwn} />}

          <ProfileTabs tabs={tabs} active={tab} onChange={setTab} />

          {tab === "Overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <RankProgress reputationScore={profile.reputationScore} />
              <StatStrip gamesPlayed={profile.gamesPlayed} attendanceRate={profile.attendanceRate} reputationScore={profile.reputationScore} streakWeeks={streakWeeks} />
              <SeasonStrip season={profile.season} />
              {isOwn && <UpcomingCard upcoming={profile.upcoming} />}
              {isOwn && profile.profileCompletion && <ProfileCompletionCard completion={profile.profileCompletion} />}
              {isOwn && <ActivityTimeline userId={id} />}
              <AchievementsRail achievements={achievements} variant="rail" />
              {isOwn && <MotivationCard message={motivation} />}
            </div>
          )}
          {tab === "Games" && <GamesTab games={profile.games} />}
          {tab === "Bookings" && isOwn && <BookingsTab bookings={profile.bookings ?? []} registrations={profile.registrations} />}
          {tab === "Achievements" && <AchievementsRail achievements={achievements} variant="grid" />}
          {tab === "Settings" && isOwn && (
            <Link href="/profile/edit" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 46, padding: "0 20px", borderRadius: 100, background: "linear-gradient(135deg,#980808,#6b0505)", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14, alignSelf: "flex-start" }}>Edit profile & settings</Link>
          )}
        </div>
      </main>
    </>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <main style={{ background: "#050505", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 14, paddingTop: 96 }}>{children}</main>;
}
