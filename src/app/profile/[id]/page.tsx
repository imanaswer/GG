"use client";
import { use, useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin, Calendar, Trophy, TrendingUp, Users, Share2, Award, Loader2,
  Pencil, Mail, ArrowRight, Flame, Zap, Target, Clock, Activity,
} from "lucide-react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { Stars, SkillBadge, StatusBadge, fmtDate } from "@/components/Shared";
import { useUserProfile, useCancelBooking, type UserProfile, type Game } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { HERO_BACKDROPS, pickFallback, GAME_FALLBACKS } from "@/lib/premium-images";

const ease = [0.16, 1, 0.3, 1] as const;

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: profile, isLoading, error } = useUserProfile(id);
  const { user } = useAuth();
  const cancelBooking = useCancelBooking();
  const isOwn = user?.id === id;

  const tabs: string[] = ["Overview", "Sports", "Upcoming", "Achievements", ...(isOwn ? ["Bookings"] : [])];
  const [tab, setTab] = useState("Overview");

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#050505" }}>
        <NavBar />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 160 }}>
          <Loader2 size={32} color="#e63946" style={{ animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ minHeight: "100vh", background: "#050505" }}>
        <NavBar />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, paddingTop: 160 }}>
          <p style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>Profile not found</p>
          <Link href="/" style={{ padding: "12px 24px", borderRadius: 10, background: "#e63946", color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const hero = HERO_BACKDROPS[Math.abs(profile.id.charCodeAt(0)) % HERO_BACKDROPS.length];
  const joined = new Date(profile.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  // Derived: member tenure, level from gamesPlayed, next upcoming game
  const monthsSince = monthsBetween(new Date(profile.createdAt), new Date());
  const level = getLevel(profile.gamesPlayed);
  const nextGame = (profile.upcomingGames ?? [])
    .slice()
    .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt))[0];

  return (
    <div style={{ minHeight: "100vh", background: "#050505" }}>
      <NavBar />

      {/* Hero backdrop */}
      <section className="profile-hero" style={{ position: "relative", height: 340, overflow: "hidden" }}>
        <Image
          src={hero.src}
          alt={hero.alt}
          fill priority quality={80} sizes="100vw"
          style={{ objectFit: "cover" }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, rgba(5,5,5,0.4) 0%, rgba(5,5,5,0.75) 60%, #050505 100%)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 70% 60% at 20% 40%, rgba(230,57,70,0.18) 0%, transparent 60%)",
        }} />
      </section>

      <main className="profile-main" style={{ marginTop: -140, position: "relative", paddingBottom: 80 }}>
        <div className="container-lg" style={{ maxWidth: 1120 }}>

          {/* Identity card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
            className="identity-card"
            style={{
              background: "rgba(11,11,11,0.92)",
              backdropFilter: "blur(24px) saturate(1.4)",
              WebkitBackdropFilter: "blur(24px) saturate(1.4)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 24,
              padding: "32px 36px",
              marginBottom: 22,
              boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
            }}
          >
            <div className="profile-header" style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 28,
              alignItems: "flex-start",
            }}>
              {/* Avatar with level ring */}
              <div style={{ position: "relative", flexShrink: 0 }} className="profile-avatar-wrap">
                <LevelRing level={level} size={132}>
                  <AvatarCard name={profile.name} url={profile.avatarUrl} level={level} />
                </LevelRing>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.35, type: "spring", stiffness: 220, damping: 16 }}
                  style={{
                    position: "absolute",
                    bottom: -6, right: -2,
                    padding: "4px 10px",
                    borderRadius: 100,
                    background: `linear-gradient(135deg, ${level.color}, ${level.colorDim})`,
                    color: "#fff", fontSize: 10, fontWeight: 800,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    boxShadow: `0 6px 16px ${level.color}55`,
                    border: "2px solid #0b0b0b",
                    whiteSpace: "nowrap",
                  }}
                >
                  {level.icon} {level.label}
                </motion.div>
              </div>

              {/* Identity text */}
              <div style={{ minWidth: 0 }} className="profile-identity-text">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                  <h1 style={{
                    fontSize: "clamp(24px, 3.2vw, 34px)",
                    fontWeight: 800,
                    color: "#fff",
                    letterSpacing: "-0.03em",
                    lineHeight: 1.1,
                  }}>
                    {profile.name}
                  </h1>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 11px",
                    borderRadius: 100,
                    background: "rgba(230,57,70,0.12)",
                    color: "#e63946",
                    border: "1px solid rgba(230,57,70,0.25)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}>
                    {profile.role}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 14 }}>
                  @{profile.username}
                </p>

                <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: profile.bio ? 14 : 0 }}>
                  {profile.location && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <MapPin size={14} color="#e63946" /> {profile.location}
                    </span>
                  )}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Calendar size={14} color="rgba(255,255,255,0.5)" /> Joined {joined}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Clock size={14} color="rgba(255,255,255,0.5)" /> {monthsSince < 1 ? "This month" : monthsSince < 12 ? `${monthsSince} mo` : `${(monthsSince / 12).toFixed(1)} yrs`} on Game Ground
                  </span>
                </div>

                {profile.bio && (
                  <p style={{
                    fontSize: 14.5,
                    color: "rgba(255,255,255,0.7)",
                    lineHeight: 1.6,
                    maxWidth: 560,
                  }}>
                    {profile.bio}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end", flexShrink: 0 }} className="profile-actions">
                {isOwn ? (
                  <Link href="/profile/edit" style={primaryPill}>
                    <Pencil size={13} /> Edit profile
                  </Link>
                ) : profile.email ? (
                  <a href={`mailto:${profile.email}`} style={primaryPill}>
                    <Mail size={13} /> Message
                  </a>
                ) : null}
                <button
                  onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success("Profile link copied"); }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    height: 36, padding: "0 14px", borderRadius: 100,
                    background: "rgba(255,255,255,0.04)",
                    color: "rgba(255,255,255,0.75)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  <Share2 size={12} /> Share
                </button>
              </div>
            </div>

            {/* Stats strip */}
            <div
              className="profile-stats"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 14,
                marginTop: 28,
                paddingTop: 24,
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <StatTile Icon={TrendingUp} label="Reliability" value={profile.reliabilityScore} decimals={1} accent="#e63946" footer={<Stars value={profile.reliabilityScore} size={11} />} />
              <StatTile Icon={Calendar} label="Games played" value={profile.gamesPlayed} />
              <StatTile Icon={Users} label="Organized" value={profile.gamesOrganized} />
              <StatTile Icon={Trophy} label="Attendance" value={profile.attendanceRate} suffix="%" />
            </div>
          </motion.div>

          {/* Tab nav */}
          <div className="profile-tabs-wrap">
            <div className="profile-tabs">
              {tabs.map(t => {
                const active = tab === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      padding: "9px 18px",
                      borderRadius: 100,
                      fontSize: 13,
                      fontWeight: active ? 700 : 500,
                      background: active ? "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)" : "transparent",
                      color: active ? "#fff" : "rgba(255,255,255,0.55)",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 180ms ease",
                      boxShadow: active ? "0 4px 14px rgba(230,57,70,0.3)" : "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease }}
            >
              {tab === "Overview" && (
                <OverviewTab profile={profile} nextGame={nextGame} level={level} />
              )}

              {tab === "Sports" && (
                profile.sports?.length === 0 ? (
                  <EmptyState copy="No sports activity yet." cta={{ href: "/play", label: "Find a game" }} />
                ) : (
                  <div className="sports-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
                    {profile.sports?.map((s, i) => (
                      <SportCard key={s.sport} s={s} index={i} total={profile.gamesPlayed} />
                    ))}
                  </div>
                )
              )}

              {tab === "Upcoming" && (
                !profile.upcomingGames?.length ? (
                  <EmptyState copy="No upcoming games." cta={{ href: "/play", label: "Find a game" }} />
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                    {profile.upcomingGames.map((game, i) => (
                      <UpcomingGameCard key={game.id} game={game} index={i} />
                    ))}
                  </div>
                )
              )}

              {tab === "Achievements" && (
                <AchievementsTab profile={profile} />
              )}

              {tab === "Bookings" && isOwn && (
                !profile.bookings?.length ? (
                  <EmptyState copy="No bookings yet." cta={{ href: "/learn", label: "Find a coach" }} />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {profile.bookings.map((b, i) => (
                      <motion.div
                        key={b.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.4, ease }}
                        className="booking-row"
                        style={{
                          background: "#0b0b0b",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: 16,
                          padding: "16px 20px",
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: 16,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                          {b.imageUrl && (
                            <div style={{ width: 52, height: 52, borderRadius: 12, overflow: "hidden", flexShrink: 0, position: "relative" }}>
                              <Image
                                src={b.imageUrl} alt={b.coachName ?? ""} fill quality={75} sizes="52px"
                                style={{ objectFit: "cover" }}
                              />
                            </div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 14.5, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {b.coachName}
                            </p>
                            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                              {b.sport} · {b.location}
                            </p>
                            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                              Booked {new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                          <StatusBadge status={b.status} />
                          {b.status === "pending" && (
                            <button
                              disabled={cancelBooking.isPending}
                              onClick={() => cancelBooking.mutate(b.id)}
                              style={{
                                padding: "6px 14px",
                                borderRadius: 100,
                                fontSize: 12, fontWeight: 600,
                                background: "rgba(239,68,68,0.08)",
                                color: "#ef4444",
                                border: "1px solid rgba(239,68,68,0.28)",
                                cursor: cancelBooking.isPending ? "not-allowed" : "pointer",
                                fontFamily: "inherit",
                                opacity: cancelBooking.isPending ? 0.6 : 1,
                              }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <style>{`
        .profile-tabs-wrap {
          margin-bottom: 22px;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .profile-tabs-wrap::-webkit-scrollbar { display: none; }
        .profile-tabs {
          display: inline-flex;
          padding: 4px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 100px;
          gap: 2px;
        }
        @media (max-width: 780px) {
          .profile-hero { height: 220px !important; }
          .profile-main { margin-top: -100px !important; }
          .identity-card { padding: 22px 20px !important; border-radius: 20px !important; }
          .profile-header { grid-template-columns: auto 1fr !important; gap: 18px !important; }
          .profile-actions { grid-column: 1 / -1; align-items: stretch !important; flex-direction: row !important; flex-wrap: wrap; }
          .profile-stats { grid-template-columns: repeat(2, 1fr) !important; margin-top: 20px !important; padding-top: 18px !important; }
          .profile-avatar-wrap { transform: scale(0.88); transform-origin: top left; }
          .sports-grid { grid-template-columns: 1fr !important; }
          .booking-row { grid-template-columns: 1fr !important; gap: 10px !important; }
        }
      `}</style>
    </div>
  );
}

/* ── Overview tab ─────────────────────────────────────────── */

function OverviewTab({
  profile, nextGame, level,
}: {
  profile: UserProfile;
  nextGame?: Game;
  level: LevelInfo;
}) {
  const topSports = (profile.sports ?? []).slice(0, 3);
  const totalUpcoming = profile.upcomingGames?.length ?? 0;
  const totalAchievements = profile.achievements?.length ?? 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }} className="overview-grid">

      {/* Next game spotlight */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        style={{
          gridColumn: "1 / -1",
          background: "linear-gradient(135deg, rgba(230,57,70,0.12) 0%, rgba(11,11,11,0.98) 70%)",
          border: "1px solid rgba(230,57,70,0.22)",
          borderRadius: 20,
          padding: "22px 24px",
          display: "flex",
          alignItems: "center",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <div style={{
          width: 46, height: 46, borderRadius: 14,
          background: "rgba(230,57,70,0.18)",
          border: "1px solid rgba(230,57,70,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Flame size={20} color="#ff6b74" />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#ff6b74", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
            {nextGame ? "Up next" : "No upcoming games"}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 4 }}>
            {nextGame ? nextGame.title : "Find something to play"}
          </div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)" }}>
            {nextGame
              ? <><Calendar size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "-1px" }} /> {fmtDate(nextGame.scheduledAt)} · <MapPin size={12} style={{ display: "inline", marginLeft: 4, marginRight: 4, verticalAlign: "-1px" }} /> {nextGame.location}</>
              : "Check /play for pickup games nearby."}
          </div>
        </div>
        {nextGame ? (
          <Link href={`/game/${nextGame.id}`} style={primaryPill}>
            Open <ArrowRight size={13} />
          </Link>
        ) : (
          <Link href="/play" style={primaryPill}>
            Browse <ArrowRight size={13} />
          </Link>
        )}
      </motion.div>

      {/* Activity card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease }}
        style={{
          background: "#0b0b0b",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 20,
          padding: "22px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <Activity size={14} color="#e63946" />
          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Last 12 weeks
          </span>
        </div>
        <ActivityHeatmap gamesPlayed={profile.gamesPlayed} createdAt={profile.createdAt} upcomingCount={totalUpcoming} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
          <span>Less</span>
          <span style={{ display: "inline-flex", gap: 3 }}>
            {[0, 1, 2, 3].map(v => (
              <span key={v} style={{
                width: 10, height: 10, borderRadius: 2,
                background: heatColor(v),
              }} />
            ))}
          </span>
          <span>More</span>
        </div>
      </motion.div>

      {/* Level progress */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.14, ease }}
        style={{
          background: "#0b0b0b",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 20,
          padding: "22px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <Zap size={14} color="#e63946" />
          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Player level
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>
            {level.icon} {level.label}
          </span>
        </div>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.55, marginBottom: 16 }}>
          {level.next
            ? `${level.next.gamesRequired - profile.gamesPlayed} more games to reach ${level.next.label}.`
            : "Peak tier unlocked. Keep the streak alive."}
        </p>
        <div style={{ height: 8, background: "rgba(255,255,255,0.04)", borderRadius: 100, overflow: "hidden" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${level.progressPct}%` }}
            transition={{ duration: 1.1, ease, delay: 0.2 }}
            style={{
              height: "100%",
              background: `linear-gradient(90deg, ${level.colorDim}, ${level.color})`,
              borderRadius: 100,
              boxShadow: `0 0 12px ${level.color}66`,
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
          <span>{level.floor} games</span>
          <span>{level.next?.gamesRequired ?? "∞"}</span>
        </div>
      </motion.div>

      {/* Top sports */}
      {topSports.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease }}
          style={{
            gridColumn: "1 / -1",
            background: "#0b0b0b",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 20,
            padding: "22px 24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Target size={14} color="#e63946" />
              <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Top sports
              </span>
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>
              {profile.sports.length} total
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            {topSports.map((s, i) => (
              <SportCard key={s.sport} s={s} index={i} total={profile.gamesPlayed} compact />
            ))}
          </div>
        </motion.div>
      )}

      {/* Summary chips */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.26, ease }}
        style={{
          gridColumn: "1 / -1",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <SummaryChip Icon={Calendar} label="Upcoming" value={totalUpcoming} hint={totalUpcoming ? "games on the books" : "nothing booked"} />
        <SummaryChip Icon={Award} label="Achievements" value={totalAchievements} hint={totalAchievements === 1 ? "badge earned" : "badges earned"} />
        <SummaryChip Icon={Target} label="Sports played" value={profile.sports?.length ?? 0} hint="across all time" />
      </motion.div>
    </div>
  );
}

/* ── Sport card (full + compact) ──────────────────────────── */

function SportCard({
  s, index, total, compact,
}: {
  s: UserProfile["sports"][number];
  index: number;
  total: number;
  compact?: boolean;
}) {
  const pct = (s.games / Math.max(total, 1)) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.45, ease }}
      whileHover={{ y: -3, borderColor: "rgba(230,57,70,0.28)" }}
      style={{
        background: compact ? "rgba(255,255,255,0.02)" : "#0b0b0b",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: compact ? 14 : 18,
        padding: compact ? "14px 16px" : "20px 22px",
        transition: "border-color 250ms ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: compact ? 14 : 17, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {s.sport}
          </span>
          <SkillBadge level={s.level} />
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: compact ? 18 : 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
            <CountUp to={s.games} />
          </span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginLeft: 4 }}>games</span>
        </div>
      </div>
      <div style={{
        height: 5,
        background: "rgba(255,255,255,0.05)",
        borderRadius: 100,
        overflow: "hidden",
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, pct)}%` }}
          transition={{ duration: 0.9, ease, delay: 0.12 + index * 0.06 }}
          style={{
            height: "100%",
            background: "linear-gradient(90deg, #e63946, #ff4d5a)",
            borderRadius: 100,
            boxShadow: "0 0 10px rgba(230,57,70,0.4)",
          }}
        />
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>
        {pct.toFixed(0)}% of total games
      </div>
    </motion.div>
  );
}

/* ── Upcoming game card ───────────────────────────────────── */

function UpcomingGameCard({ game, index }: { game: Game; index: number }) {
  const img = game.imageUrl || pickFallback(GAME_FALLBACKS, game.id).src;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.45, ease }}
    >
      <Link href={`/game/${game.id}`} style={{ textDecoration: "none" }} className="upcoming-card">
        <motion.article
          whileHover={{ y: -4, borderColor: "rgba(230,57,70,0.28)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}
          style={{
            background: "#0b0b0b",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 18,
            overflow: "hidden",
          }}
        >
          <div style={{ position: "relative", aspectRatio: "16/10", overflow: "hidden" }}>
            <Image
              src={img} alt={game.title} fill quality={80} sizes="(max-width: 640px) 100vw, 360px"
              style={{ objectFit: "cover" }}
            />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)" }} />
            <span style={{
              position: "absolute", top: 12, left: 12,
              fontSize: 11, fontWeight: 700,
              padding: "4px 10px", borderRadius: 100,
              background: "rgba(230,57,70,0.9)",
              color: "#fff",
              boxShadow: "0 4px 14px rgba(230,57,70,0.5)",
            }}>
              {game.sport}
            </span>
          </div>
          <div style={{ padding: "16px 18px" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 8, letterSpacing: "-0.01em" }}>{game.title}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, color: "rgba(255,255,255,0.55)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Calendar size={12} /> {fmtDate(game.scheduledAt)}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <MapPin size={12} /> {game.location}
              </span>
            </div>
          </div>
        </motion.article>
      </Link>
    </motion.div>
  );
}

/* ── Level ring ────────────────────────────────────────────── */

function LevelRing({ level, size, children }: { level: LevelInfo; size: number; children: React.ReactNode }) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dashOffset = c - (level.progressPct / 100) * c;

  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={level.color} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.1, ease, delay: 0.15 }}
          style={{ filter: `drop-shadow(0 0 6px ${level.color}88)` }}
        />
      </svg>
      {children}
    </div>
  );
}

/* ── Activity heatmap (12 weeks × 7 days derived) ─────────── */

function ActivityHeatmap({ gamesPlayed, createdAt, upcomingCount }: { gamesPlayed: number; createdAt: string; upcomingCount: number }) {
  // Deterministic "busy" pattern derived from gamesPlayed frequency.
  const cells = useMemo(() => {
    const weeks = 12;
    const days = 7;
    const seed = gamesPlayed * 7 + new Date(createdAt).getDate();
    const density = Math.min(1, (gamesPlayed + upcomingCount) / 30);
    const out: number[][] = [];
    let s = seed;
    for (let w = 0; w < weeks; w++) {
      const row: number[] = [];
      for (let d = 0; d < days; d++) {
        s = (s * 9301 + 49297) % 233280;
        const r = s / 233280;
        const weight = (w / weeks) * 0.35 + density * 0.65;
        let v = 0;
        if (r < weight * 0.35) v = 3;
        else if (r < weight * 0.6) v = 2;
        else if (r < weight * 0.85) v = 1;
        row.push(v);
      }
      out.push(row);
    }
    return out;
  }, [gamesPlayed, createdAt, upcomingCount]);

  return (
    <div style={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
      {cells.map((col, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {col.map((v, j) => (
            <motion.span
              key={j}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: (i * 7 + j) * 0.006 }}
              style={{
                width: 12, height: 12, borderRadius: 3,
                background: heatColor(v),
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function heatColor(v: number) {
  if (v === 0) return "rgba(255,255,255,0.04)";
  if (v === 1) return "rgba(230,57,70,0.22)";
  if (v === 2) return "rgba(230,57,70,0.52)";
  return "#e63946";
}

/* ── Bits ──────────────────────────────────────────────────── */

const primaryPill: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 7,
  height: 40, padding: "0 18px", borderRadius: 100,
  background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
  color: "#fff", fontSize: 13, fontWeight: 700,
  textDecoration: "none",
  boxShadow: "0 6px 20px rgba(230,57,70,0.35)",
  border: "none", cursor: "pointer", fontFamily: "inherit",
};

function StatTile({
  Icon, label, value, accent, footer, decimals, suffix,
}: {
  Icon: typeof Calendar;
  label: string;
  value: number;
  accent?: string;
  footer?: React.ReactNode;
  decimals?: number;
  suffix?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2, borderColor: "rgba(255,255,255,0.1)" }}
      style={{
        padding: "14px 16px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 14,
        transition: "border-color 250ms ease",
      }}
    >
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
        <Icon size={11} color={accent ?? "rgba(255,255,255,0.55)"} /> {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent ?? "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>
        <CountUp to={value} decimals={decimals} suffix={suffix} />
      </div>
      {footer && <div style={{ marginTop: 6 }}>{footer}</div>}
    </motion.div>
  );
}

function SummaryChip({ Icon, label, value, hint }: { Icon: typeof Calendar; label: string; value: number; hint: string }) {
  return (
    <motion.div
      whileHover={{ y: -2, borderColor: "rgba(230,57,70,0.28)" }}
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex", alignItems: "center", gap: 12,
        transition: "border-color 250ms ease",
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: "rgba(230,57,70,0.1)",
        border: "1px solid rgba(230,57,70,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={15} color="#ff6b74" />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
          <CountUp to={value} /> <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.45)", marginLeft: 4 }}>{hint}</span>
        </div>
      </div>
    </motion.div>
  );
}

function CountUp({ to, decimals = 0, suffix = "" }: { to: number; decimals?: number; suffix?: string }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, v =>
    decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString(),
  );
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(mv, to, { duration: 1.1, ease: [0.16, 1, 0.3, 1] });
    const unsub = rounded.on("change", v => {
      if (ref.current) ref.current.textContent = `${v}${suffix}`;
    });
    return () => { controls.stop(); unsub(); };
  }, [to, decimals, suffix, mv, rounded]);

  return <span ref={ref}>{decimals ? (0).toFixed(decimals) : 0}{suffix}</span>;
}

function EmptyState({ copy, cta }: { copy: string; cta: { href: string; label: string } }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
      style={{
        textAlign: "center",
        padding: "64px 24px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 20,
      }}
    >
      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 15, marginBottom: 20 }}>{copy}</p>
      <Link href={cta.href} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "12px 24px", borderRadius: 100,
        background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
        color: "#fff", textDecoration: "none",
        fontWeight: 700, fontSize: 14,
        boxShadow: "0 6px 20px rgba(230,57,70,0.3)",
      }}>
        {cta.label} <ArrowRight size={14} />
      </Link>
    </motion.div>
  );
}

/* ── Helpers ──────────────────────────────────────────────── */

type LevelInfo = {
  label: string;
  icon: string;
  color: string;
  colorDim: string;
  floor: number;
  progressPct: number;
  next: { label: string; gamesRequired: number } | null;
};

const LEVELS: { label: string; icon: string; min: number; color: string; colorDim: string }[] = [
  { label: "Rookie",    icon: "🌱", min: 0,   color: "#6b7280", colorDim: "#374151" },
  { label: "Regular",   icon: "🔥", min: 5,   color: "#f97316", colorDim: "#b45309" },
  { label: "Pro",       icon: "⚡", min: 20,  color: "#eab308", colorDim: "#a16207" },
  { label: "Elite",     icon: "💎", min: 50,  color: "#60a5fa", colorDim: "#1e40af" },
  { label: "Legend",    icon: "👑", min: 100, color: "#e63946", colorDim: "#991b1b" },
];

function getLevel(games: number): LevelInfo {
  let current = LEVELS[0];
  let next: typeof LEVELS[number] | null = null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (games >= LEVELS[i].min) {
      current = LEVELS[i];
      next = LEVELS[i + 1] ?? null;
    }
  }
  const span = (next?.min ?? current.min + 20) - current.min;
  const progressPct = next
    ? Math.min(100, ((games - current.min) / span) * 100)
    : 100;
  return {
    label: current.label,
    icon: current.icon,
    color: current.color,
    colorDim: current.colorDim,
    floor: current.min,
    progressPct,
    next: next ? { label: next.label, gamesRequired: next.min } : null,
  };
}

function monthsBetween(a: Date, b: Date) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

/* ── Avatar card ───────────────────────────────────────────── */

function AvatarCard({ name, url, level }: { name: string; url?: string | null; level: LevelInfo }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join("");

  // Deterministic gradient from the name
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const gradient = `linear-gradient(135deg, hsl(${hue}, 72%, 52%) 0%, hsl(${(hue + 40) % 360}, 68%, 38%) 100%)`;

  return (
    <div style={{
      position: "relative",
      width: 108, height: 108, borderRadius: "50%",
      overflow: "hidden",
      border: "3px solid rgba(230,57,70,0.6)",
      boxShadow: `0 0 40px ${level.color}55, inset 0 0 0 4px #0b0b0b`,
      background: gradient,
    }}>
      {url ? (
        // Using native <img> so SVG avatars (dicebear) render regardless of next/image remotePatterns config.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={name}
          width={108}
          height={108}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div style={{
          width: "100%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 40, fontWeight: 900, color: "#fff",
          letterSpacing: "-0.03em",
          textShadow: "0 2px 12px rgba(0,0,0,0.4)",
        }}>
          {initials || name[0]?.toUpperCase()}
        </div>
      )}
    </div>
  );
}

/* ── Achievements tab ──────────────────────────────────────── */

type Rarity = "common" | "rare" | "epic" | "legendary";
type BadgeDef = {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: Rarity;
  metric: (p: UserProfile & { monthsSince: number }) => number;
  target: number;
};

const RARITY: Record<Rarity, { label: string; color: string; colorDim: string; glow: string }> = {
  common:    { label: "Common",    color: "#9ca3af", colorDim: "#4b5563", glow: "rgba(156,163,175,0.25)" },
  rare:      { label: "Rare",      color: "#60a5fa", colorDim: "#1e40af", glow: "rgba(96,165,250,0.35)" },
  epic:      { label: "Epic",      color: "#c084fc", colorDim: "#6b21a8", glow: "rgba(192,132,252,0.4)" },
  legendary: { label: "Legendary", color: "#fbbf24", colorDim: "#b45309", glow: "rgba(251,191,36,0.45)" },
};

const BADGES: BadgeDef[] = [
  { id: "first-game",  title: "First Game",    description: "Play your first pickup game",     icon: "🏃", rarity: "common",    metric: p => p.gamesPlayed,        target: 1 },
  { id: "regular",     title: "Regular",       description: "Play 10 games",                   icon: "⭐", rarity: "rare",      metric: p => p.gamesPlayed,        target: 10 },
  { id: "veteran",     title: "Veteran",       description: "Play 50 games",                   icon: "🎖️", rarity: "epic",      metric: p => p.gamesPlayed,        target: 50 },
  { id: "centurion",   title: "Centurion",     description: "Play 100 games",                  icon: "💯", rarity: "legendary", metric: p => p.gamesPlayed,        target: 100 },
  { id: "organiser",   title: "Organiser",     description: "Organise your first game",       icon: "🎯", rarity: "rare",      metric: p => p.gamesOrganized,     target: 1 },
  { id: "host-master", title: "Host Master",   description: "Organise 10 games",               icon: "👑", rarity: "epic",      metric: p => p.gamesOrganized,     target: 10 },
  { id: "reliable",    title: "Reliable",      description: "Reach 95% attendance",           icon: "✅", rarity: "rare",      metric: p => p.attendanceRate,    target: 95 },
  { id: "iron-will",   title: "Iron Will",     description: "100% attendance over 10+ games",  icon: "🛡️", rarity: "epic",      metric: p => (p.gamesPlayed >= 10 && p.attendanceRate >= 100 ? 1 : 0), target: 1 },
  { id: "5-star",      title: "Five-Star",     description: "Hit a 4.5+ reliability score",    icon: "🌠", rarity: "rare",      metric: p => Math.round(p.reliabilityScore * 10), target: 45 },
  { id: "flawless",    title: "Flawless",      description: "Hit a 4.9+ reliability score",    icon: "💎", rarity: "legendary", metric: p => Math.round(p.reliabilityScore * 10), target: 49 },
  { id: "multi-sport", title: "Multi-Sport",   description: "Play 3 different sports",         icon: "🏆", rarity: "rare",      metric: p => p.sports?.length ?? 0, target: 3 },
  { id: "decathlete",  title: "Decathlete",    description: "Play 5 different sports",         icon: "🌟", rarity: "epic",      metric: p => p.sports?.length ?? 0, target: 5 },
  { id: "year-one",    title: "Year One",      description: "Spend 12 months on Game Ground",  icon: "📅", rarity: "rare",      metric: p => p.monthsSince,         target: 12 },
  { id: "og",          title: "OG",            description: "Spend 2 years on Game Ground",    icon: "🔱", rarity: "legendary", metric: p => p.monthsSince,         target: 24 },
];

function AchievementsTab({ profile }: { profile: UserProfile }) {
  const monthsSince = monthsBetween(new Date(profile.createdAt), new Date());
  const enriched = { ...profile, monthsSince };

  const computed = BADGES.map(b => {
    const value = Math.max(0, b.metric(enriched));
    const progress = Math.min(1, value / b.target);
    return { def: b, value, progress, earned: value >= b.target };
  });

  const earned = computed.filter(b => b.earned);
  const locked = computed.filter(b => !b.earned).sort((a, b) => b.progress - a.progress);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Summary strip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease }}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        <BadgeMetaChip label="Earned" value={`${earned.length} / ${BADGES.length}`} accent="#e63946" />
        <BadgeMetaChip label="Legendary" value={`${earned.filter(b => b.def.rarity === "legendary").length}`} accent={RARITY.legendary.color} />
        <BadgeMetaChip label="Epic" value={`${earned.filter(b => b.def.rarity === "epic").length}`} accent={RARITY.epic.color} />
        <BadgeMetaChip label="Completion" value={`${Math.round((earned.length / BADGES.length) * 100)}%`} accent="#60a5fa" />
      </motion.div>

      {/* Earned */}
      <div>
        <BadgeSectionHeader title="Earned" count={earned.length} />
        {earned.length === 0 ? (
          <EmptyState copy="No badges yet — play a game to earn your first one." cta={{ href: "/play", label: "Find a game" }} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {earned.map((b, i) => (
              <BadgeCard key={b.def.id} badge={b} index={i} earned />
            ))}
          </div>
        )}
      </div>

      {/* Locked / In progress */}
      {locked.length > 0 && (
        <div>
          <BadgeSectionHeader title="In progress" count={locked.length} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {locked.map((b, i) => (
              <BadgeCard key={b.def.id} badge={b} index={i} earned={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BadgeSectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{title}</span>
      <span style={{
        fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)",
        padding: "2px 9px", borderRadius: 100,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>{count}</span>
      <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
}

function BadgeMetaChip({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14,
      padding: "14px 16px",
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent, letterSpacing: "-0.02em" }}>
        {value}
      </div>
    </div>
  );
}

function BadgeCard({
  badge, index, earned,
}: {
  badge: { def: BadgeDef; value: number; progress: number; earned: boolean };
  index: number;
  earned: boolean;
}) {
  const r = RARITY[badge.def.rarity];
  const bg = earned
    ? `linear-gradient(135deg, ${r.color}22 0%, rgba(11,11,11,0.98) 72%)`
    : "rgba(255,255,255,0.02)";
  const border = earned ? `${r.color}44` : "rgba(255,255,255,0.06)";
  const hoverBorder = earned ? `${r.color}88` : "rgba(255,255,255,0.14)";

  const pctLabel =
    badge.def.id === "5-star" || badge.def.id === "flawless"
      ? `${(badge.value / 10).toFixed(1)} / ${(badge.def.target / 10).toFixed(1)}`
      : `${badge.value} / ${badge.def.target}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.45, ease }}
      whileHover={{ y: -4, borderColor: hoverBorder }}
      style={{
        position: "relative",
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 18,
        padding: "18px 18px 16px",
        display: "flex", flexDirection: "column", gap: 12,
        transition: "border-color 250ms ease",
        boxShadow: earned ? `0 8px 28px ${r.glow}` : "none",
        overflow: "hidden",
      }}
    >
      {/* Rarity ribbon */}
      <div style={{
        position: "absolute",
        top: 12, right: 12,
        fontSize: 9, fontWeight: 800,
        padding: "3px 8px", borderRadius: 100,
        color: earned ? r.color : "rgba(255,255,255,0.4)",
        background: earned ? `${r.color}18` : "rgba(255,255,255,0.04)",
        border: `1px solid ${earned ? r.color + "55" : "rgba(255,255,255,0.08)"}`,
        letterSpacing: "0.1em", textTransform: "uppercase",
      }}>
        {r.label}
      </div>

      <motion.div
        whileHover={earned ? { rotate: [0, -8, 8, -4, 0], scale: 1.08 } : undefined}
        transition={{ duration: 0.5 }}
        style={{
          fontSize: 30, lineHeight: 1,
          width: 56, height: 56, borderRadius: 16,
          background: earned ? `linear-gradient(135deg, ${r.color}26, ${r.colorDim}33)` : "rgba(255,255,255,0.03)",
          border: `1px solid ${earned ? r.color + "55" : "rgba(255,255,255,0.06)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          filter: earned ? "none" : "grayscale(1) opacity(0.55)",
        }}
      >
        {earned ? badge.def.icon : "🔒"}
      </motion.div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: earned ? "#fff" : "rgba(255,255,255,0.75)", letterSpacing: "-0.01em", marginBottom: 4 }}>
          {badge.def.title}
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
          {badge.def.description}
        </p>
      </div>

      {!earned && (
        <div>
          <div style={{ height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 100, overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${badge.progress * 100}%` }}
              transition={{ duration: 0.9, ease, delay: 0.1 + index * 0.04 }}
              style={{
                height: "100%",
                background: `linear-gradient(90deg, ${r.colorDim}, ${r.color})`,
                borderRadius: 100,
              }}
            />
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 600, display: "flex", justifyContent: "space-between" }}>
            <span>{pctLabel}</span>
            <span>{Math.round(badge.progress * 100)}%</span>
          </div>
        </div>
      )}

      {earned && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: r.color }}>
          <Award size={11} /> Unlocked
        </div>
      )}
    </motion.div>
  );
}
