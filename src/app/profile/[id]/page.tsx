"use client";
import { use, useState } from "react";
import Link from "next/link";
import { MapPin, Calendar, Trophy, TrendingUp, Users, Share2, Award, Loader2 } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { Img, Stars, SkillBadge, StatusBadge, fmtDate } from "@/components/Shared";
import { Skeleton } from "@/components/ui";
import { useUserProfile, useCancelBooking } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

/* ── tiny inline Tab bar ────────────────────────────────────────────── */
function TabBar({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 2, background: "#111", borderRadius: 10, padding: 4, width: "fit-content", flexWrap: "wrap" }}>
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)} style={{
          padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
          border: "none", cursor: "pointer", fontFamily: "inherit",
          background: active === t ? "#1c1c1c" : "transparent",
          color: active === t ? "#fff" : "#6b7280",
          transition: "all 0.15s",
        }}>{t}</button>
      ))}
    </div>
  );
}

/* ── progress bar ───────────────────────────────────────────────────── */
function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{ height: 5, background: "#1c1c1c", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, value)}%`, background: "#e63946", borderRadius: 99, transition: "width 0.5s" }} />
    </div>
  );
}

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: profile, isLoading, error } = useUserProfile(id);
  const { user } = useAuth();
  const cancelBooking = useCancelBooking();
  const isOwn = user?.id === id;

  const tabs = ["Sports", "Upcoming", "Achievements", ...(isOwn ? ["Bookings"] : [])];
  const [tab, setTab] = useState("Sports");

  if (isLoading) return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <NavBar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 120 }}>
        <Loader2 size={32} color="#e63946" style={{ animation: "spin 1s linear infinite" }} />
        <style jsx global>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !profile) return (
    <div style={{ minHeight: "100vh", background: "#080808", display: "flex", flexDirection: "column" }}>
      <NavBar />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <p style={{ color: "#fff", fontSize: 20 }}>Profile not found</p>
        <Link href="/" style={{ padding: "10px 22px", borderRadius: 9, background: "#e63946", color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>Go Home</Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <NavBar />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "36px 24px 60px" }}>

        {/* ── Profile Header Card ─────────────────────────────────── */}
        <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "28px 28px 24px", marginBottom: 28 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 24, marginBottom: 24 }}>
            {/* Avatar */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", border: "3px solid #e63946" }}>
                {profile.avatarUrl
                  ? <Img src={profile.avatarUrl} alt={profile.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: "100%", background: "#e63946", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 900, color: "#fff" }}>{profile.name[0]}</div>}
              </div>
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <h1 style={{ fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>{profile.name}</h1>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: "rgba(255,255,255,0.08)", color: "#9ca3af", textTransform: "capitalize" }}>
                  {profile.role}
                </span>
              </div>
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>@{profile.username}</p>
              {profile.location && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
                  <MapPin size={13} />{profile.location}
                </div>
              )}
              {profile.bio && <p style={{ fontSize: 14, color: "#9ca3af", maxWidth: 440, lineHeight: 1.6 }}>{profile.bio}</p>}
            </div>

            {/* Reliability score */}
            <div style={{
              textAlign: "center", padding: "16px 20px", borderRadius: 14,
              background: "rgba(230,57,70,0.08)", border: "1px solid rgba(230,57,70,0.2)",
              flexShrink: 0,
            }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: "#e63946", letterSpacing: "-0.04em", lineHeight: 1 }}>
                {profile.reliabilityScore.toFixed(1)}
              </div>
              <div style={{ marginTop: 5 }}><Stars value={profile.reliabilityScore} size={12} /></div>
              <div style={{ fontSize: 11, color: "#fff", fontWeight: 700, marginTop: 4 }}>Reliability</div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 12, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {[
              { Icon: Calendar, l: "Games Played", v: profile.gamesPlayed },
              { Icon: Trophy, l: "Top Sport", v: profile.sports?.[0]?.sport ?? "—" },
              { Icon: Users, l: "Organized", v: profile.gamesOrganized },
              { Icon: TrendingUp, l: "Attendance", v: `${profile.attendanceRate.toFixed(0)}%` },
            ].map(({ Icon, l, v }) => (
              <div key={l} style={{ textAlign: "center" }}>
                <Icon size={16} color="#e63946" style={{ margin: "0 auto 5px" }} />
                <div style={{ fontSize: "clamp(16px, 2vw, 22px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>{v}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Share button */}
          <div style={{ marginTop: 16 }}>
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {isOwn && (
              <Link href="/profile/edit" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "#e63946", color: "#fff", textDecoration: "none" }}>
                Edit Profile
              </Link>
            )}
            <button onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success("Profile link copied!"); }} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "transparent", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontFamily: "inherit" }}>
              <Share2 size={13} />Share
            </button>
          </div>
          </div>
        </div>

        {/* ── Tab Bar ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <TabBar tabs={tabs} active={tab} onChange={setTab} />
        </div>

        {/* ── Sports Tab ──────────────────────────────────────────── */}
        {tab === "Sports" && (
          profile.sports?.length === 0
            ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ color: "#9ca3af", marginBottom: 20, fontSize: 15 }}>No sports activity yet.</p>
                <Link href="/play" style={{ padding: "11px 24px", borderRadius: 9, background: "#e63946", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>Find a Game</Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {profile.sports?.map(s => (
                  <div key={s.sport} style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{s.sport}</span>
                        <SkillBadge level={s.level} />
                      </div>
                      <div>
                        <span style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{s.games}</span>
                        <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 4 }}>games</span>
                      </div>
                    </div>
                    <ProgressBar value={(s.games / Math.max(profile.gamesPlayed, 1)) * 100} />
                  </div>
                ))}
              </div>
            )
        )}

        {/* ── Upcoming Tab ────────────────────────────────────────── */}
        {tab === "Upcoming" && (
          !profile.upcomingGames?.length
            ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ color: "#9ca3af", marginBottom: 20, fontSize: 15 }}>No upcoming games.</p>
                <Link href="/play" style={{ padding: "11px 24px", borderRadius: 9, background: "#e63946", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>Find a Game</Link>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {profile.upcomingGames.map(game => (
                  <Link key={game.id} href={`/game/${game.id}`} style={{ textDecoration: "none" }}>
                    <div style={{
                      background: "#141414", border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 12, overflow: "hidden",
                      transition: "transform 0.2s, border-color 0.2s", cursor: "pointer",
                    }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(230,57,70,0.3)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
                      }}
                    >
                      <div style={{ position: "relative", height: 130, overflow: "hidden" }}>
                        <Img src={game.imageUrl} alt={game.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent 55%)" }} />
                        <span style={{ position: "absolute", top: 10, left: 10, fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 100, background: "rgba(230,57,70,0.9)", color: "#fff" }}>
                          {game.sport}
                        </span>
                      </div>
                      <div style={{ padding: "12px 14px" }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{game.title}</p>
                        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 3, display: "flex", gap: 6 }}>
                          <Calendar size={12} style={{ flexShrink: 0, marginTop: 1 }} />{fmtDate(game.scheduledAt)}
                        </p>
                        <p style={{ fontSize: 12, color: "#6b7280", display: "flex", gap: 6 }}>
                          <MapPin size={12} style={{ flexShrink: 0, marginTop: 1 }} />{game.location}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
        )}

        {/* ── Achievements Tab ────────────────────────────────────── */}
        {tab === "Achievements" && (
          !profile.achievements?.length
            ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ color: "#9ca3af", marginBottom: 20, fontSize: 15 }}>Play more games to earn achievements!</p>
                <Link href="/play" style={{ padding: "11px 24px", borderRadius: 9, background: "#e63946", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>Find a Game</Link>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                {profile.achievements.map(a => (
                  <div key={a.title} style={{
                    background: "#141414",
                    border: "1px solid rgba(230,57,70,0.18)",
                    borderRadius: 12, padding: "18px 20px",
                    display: "flex", alignItems: "flex-start", gap: 16,
                  }}>
                    <span style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>{a.icon}</span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{a.title}</span>
                        <Award size={14} color="#e63946" />
                      </div>
                      <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.5 }}>{a.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
        )}

        {/* ── Bookings Tab (own only) ──────────────────────────────── */}
        {tab === "Bookings" && isOwn && (
          !profile.bookings?.length
            ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ color: "#9ca3af", marginBottom: 20, fontSize: 15 }}>No bookings yet.</p>
                <Link href="/learn" style={{ padding: "11px 24px", borderRadius: 9, background: "#e63946", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>Find a Coach</Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {profile.bookings!.map(b => (
                  <div key={b.id} style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                        {b.imageUrl && (
                          <div style={{ width: 46, height: 46, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
                            <Img src={b.imageUrl} alt={b.coachName ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.coachName}</p>
                          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.sport} · {b.location}</p>
                          <p style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>{new Date(b.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <StatusBadge status={b.status} />
                        {b.status === "pending" && (
                          <button
                            disabled={cancelBooking.isPending}
                            onClick={() => cancelBooking.mutate(b.id)}
                            style={{
                              padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                              background: "transparent", color: "#ef4444",
                              border: "1px solid rgba(239,68,68,0.3)",
                              cursor: cancelBooking.isPending ? "not-allowed" : "pointer",
                              fontFamily: "inherit", opacity: cancelBooking.isPending ? 0.6 : 1,
                            }}
                          >Cancel</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
        )}
      </main>
    </div>
  );
}
