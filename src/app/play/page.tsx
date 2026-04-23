"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Plus, MapPin, Clock, Users, Star, SlidersHorizontal, ArrowUpRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { PremiumNav } from "@/components/premium/PremiumNav";
import { SmoothScroll } from "@/components/premium/SmoothScroll";
import { Reveal, Stagger } from "@/components/premium/Reveal";
import { Magnetic } from "@/components/premium/Magnetic";
import { Tilt3D } from "@/components/premium/Tilt3D";
import { SkillBadge, SportBadge, fmtDate } from "@/components/Shared";
import { useGames, useJoinGame, type GameFilters, type Game } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { STORY, GAME_FALLBACKS, pickFallback } from "@/lib/premium-images";

const SPORTS = ["Basketball", "Football", "Cricket", "Badminton", "Tennis", "Volleyball"] as const;
const COSTS = [
  { v: "free", l: "Free" },
  { v: "paid", l: "Paid" },
] as const;

/* ── Hero band ──────────────────────────────────────────── */

function Hero({ count }: { count: number | null }) {
  return (
    <section className="page-hero" style={{
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.28 }}>
        <Image
          src={STORY.play.src}
          alt={STORY.play.alt}
          fill priority quality={80} sizes="100vw"
          style={{ objectFit: "cover", filter: "saturate(0.55) brightness(0.65)" }}
        />
      </div>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(5,5,5,0.55) 0%, rgba(5,5,5,0.3) 30%, #050505 100%)",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 65% 55% at 50% 30%, rgba(230,57,70,0.14), transparent 70%)",
      }} />

      <div className="container-lg" style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 32, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 520px", minWidth: 0 }}>
          <Reveal>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "8px 16px", borderRadius: 100,
              background: "rgba(230,57,70,0.08)",
              border: "1px solid rgba(230,57,70,0.25)",
              marginBottom: 28,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#e63946", boxShadow: "0 0 12px #e63946",
              }} />
              <span style={{
                fontSize: 11, fontWeight: 600, letterSpacing: "0.16em",
                textTransform: "uppercase", color: "#ff6b74",
              }}>
                {count !== null ? `${count} pickup games live today` : "Pickup games · Kozhikode"}
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <h1 className="display" style={{
              fontSize: "clamp(44px, 7vw, 104px)",
              color: "#fff", maxWidth: 1100,
            }}>
              Your{" "}
              <span className="display-serif" style={{ color: "#ff6b74" }}>next game</span>{" "}
              is five minutes away.
            </h1>
          </Reveal>

          <Reveal delay={0.14}>
            <p style={{
              fontSize: 18, color: "rgba(255,255,255,0.6)",
              maxWidth: 640, marginTop: 28, lineHeight: 1.6,
            }}>
              Drop in on games posted by your neighbours or host your own when the
              court is free. No WhatsApp scramble — just a map and a clock.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.22}>
          <Magnetic strength={10}>
            <Link href="/create-game" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "14px 22px", borderRadius: 100,
              background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
              boxShadow: "0 0 32px rgba(230,57,70,0.4)",
              color: "#fff", fontSize: 14, fontWeight: 700,
              textDecoration: "none",
            }}>
              <Plus size={15} />
              Host a game
            </Link>
          </Magnetic>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Filter pill ────────────────────────────────────────── */

type PillGroupProps = {
  label: string;
  options: readonly { v: string; l: string }[];
  value?: string;
  onChange: (v: string) => void;
};

function PillGroup({ label, options, value, onChange }: PillGroupProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      <span className="eyebrow" style={{ marginRight: 8, fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
        {label}
      </span>
      {[{ v: "all", l: `All ${label.toLowerCase()}` }, ...options].map(opt => {
        const active = (value ?? "all") === opt.v;
        return (
          <button
            key={opt.v}
            onClick={() => onChange(opt.v)}
            style={{
              padding: "6px 14px", borderRadius: 100,
              fontSize: 12, fontWeight: 500, cursor: "pointer",
              border: "1px solid", fontFamily: "inherit",
              background: active ? "rgba(230,57,70,0.12)" : "rgba(255,255,255,0.02)",
              color: active ? "#ff6b74" : "rgba(255,255,255,0.6)",
              borderColor: active ? "rgba(230,57,70,0.35)" : "rgba(255,255,255,0.07)",
              transition: "all 180ms",
            }}
          >
            {opt.l}
          </button>
        );
      })}
    </div>
  );
}

/* ── Game card ──────────────────────────────────────────── */

function GameCard({ game }: { game: Game }) {
  const { user } = useAuth();
  const join = useJoinGame();
  const filled = game.slots - game.slotsLeft;
  const pct = Math.min(100, Math.round((filled / game.slots) * 100));
  const isFull = game.slotsLeft === 0 || game.status === "full";
  const isFree = game.costAmount === 0;
  const img = game.imageUrl || pickFallback(GAME_FALLBACKS, game.id).src;

  return (
    <Tilt3D intensity={8} data-stagger style={{ height: "100%", borderRadius: 20 }}>
    <div
      data-stagger
      style={{
        position: "relative",
        display: "flex", flexDirection: "column", height: "100%",
        background: "#0a0a0a",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 20, overflow: "hidden",
        transition: "border-color 300ms, box-shadow 300ms, transform 300ms",
      }}
      className="game-card"
    >
      {/* Image link area */}
      <Link
        href={`/game/${game.id}`}
        style={{ position: "relative", aspectRatio: "5/4", display: "block", overflow: "hidden" }}
      >
        <div style={{ position: "absolute", inset: 0 }} className="game-card-img-wrap">
          <Image
            src={img}
            alt={game.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ objectFit: "cover", filter: "saturate(0.85)" }}
          />
        </div>

        {/* Top-left badges */}
        <div style={{ position: "absolute", top: 14, left: 14, display: "flex", gap: 6 }}>
          <SportBadge sport={game.sport} />
          <SkillBadge level={game.skillLevel} />
        </div>

        {/* Top-right cost */}
        <div style={{ position: "absolute", top: 14, right: 14 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 100,
            background: isFree ? "rgba(34,197,94,0.9)" : "rgba(0,0,0,0.65)",
            color: isFree ? "#000" : "#fff",
            border: isFree ? "none" : "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(8px)",
          }}>
            {game.cost}
          </span>
        </div>

        {/* Almost full pulse */}
        {game.slotsLeft > 0 && game.slotsLeft <= 2 && (
          <motion.div
            animate={{ opacity: [1, 0.65, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{ position: "absolute", bottom: 14, left: 14 }}
          >
            <span style={{
              fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 100,
              background: "#eab308", color: "#000",
            }}>
              {game.slotsLeft} spot{game.slotsLeft === 1 ? "" : "s"} left
            </span>
          </motion.div>
        )}

        {/* Gradient + title */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.85) 100%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
          <h3 style={{
            fontSize: 18, fontWeight: 800, color: "#fff",
            letterSpacing: "-0.02em", lineHeight: 1.25, margin: 0,
            textShadow: "0 2px 16px rgba(0,0,0,0.5)",
          }}>
            {game.title}
          </h3>
        </div>
      </Link>

      {/* Meta */}
      <div style={{ padding: "18px 22px 22px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "rgba(255,255,255,0.55)" }}>
            <MapPin size={13} style={{ flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.location}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "rgba(255,255,255,0.55)" }}>
            <Clock size={13} style={{ flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {fmtDate(game.scheduledAt)} · {game.duration}min
            </span>
          </div>
        </div>

        {/* Slot bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
            <span>Spots</span>
            <span style={{ color: isFull ? "#f87171" : game.slotsLeft <= 2 ? "#fbbf24" : "rgba(255,255,255,0.8)", fontWeight: 600 }}>
              {isFull ? "Full" : `${filled}/${game.slots}`}
            </span>
          </div>
          <div style={{
            height: 4, background: "rgba(255,255,255,0.05)",
            borderRadius: 100, overflow: "hidden",
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{
                height: "100%",
                background: pct >= 100 ? "#ef4444" : pct >= 75 ? "#eab308" : "#e63946",
              }}
            />
          </div>
        </div>

        {/* Footer: organiser + join */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
            <Star size={11} fill="#eab308" color="#eab308" />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
              {game.organizerRating?.toFixed(1) ?? "—"}
            </span>
            <span style={{
              fontSize: 12, color: "rgba(255,255,255,0.45)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {game.organizerName}
            </span>
          </div>

          {user ? (
            <button
              disabled={join.isPending}
              onClick={() => join.mutate(game.id)}
              style={{
                padding: "8px 16px", borderRadius: 100,
                fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                cursor: join.isPending ? "not-allowed" : "pointer",
                border: isFull ? "1px solid rgba(255,255,255,0.1)" : "none",
                background: isFull
                  ? "transparent"
                  : "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                color: isFull ? "rgba(255,255,255,0.55)" : "#fff",
                opacity: join.isPending ? 0.6 : 1,
                boxShadow: isFull ? "none" : "0 2px 14px rgba(230,57,70,0.3)",
                flexShrink: 0,
                transition: "transform 200ms",
              }}
            >
              {join.isPending ? "…" : isFull ? "Waitlist" : "Join"}
            </button>
          ) : (
            <Link href="/login" style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "8px 16px", borderRadius: 100,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff", fontSize: 12, fontWeight: 600,
              textDecoration: "none",
              flexShrink: 0,
            }}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
    </Tilt3D>
  );
}

/* ── Skeleton ───────────────────────────────────────────── */

function GameSkeleton() {
  return (
    <div style={{
      background: "#0a0a0a",
      border: "1px solid rgba(255,255,255,0.05)",
      borderRadius: 20, overflow: "hidden", height: "100%",
    }}>
      <div className="skeleton" style={{ aspectRatio: "5/4", borderRadius: 0 }} />
      <div style={{ padding: "18px 22px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="skeleton" style={{ height: 14, width: "60%", borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 12, width: "45%", borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 4,  width: "100%", borderRadius: 100 }} />
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────── */

function PlayContent() {
  const sp = useSearchParams();
  const initialSport = sp.get("sport") || undefined;

  const [filters, setFilters] = useState<GameFilters>(initialSport ? { sport: initialSport } : {});
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 260);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error } = useGames({ ...filters, q: debounced || undefined });

  const set = (k: keyof GameFilters, v: string) =>
    setFilters(p => ({ ...p, [k]: v === "all" || !v ? undefined : v }));

  const hasFilters = useMemo(
    () => !!search || Object.values(filters).some(Boolean),
    [search, filters],
  );

  return (
    <>
      <SmoothScroll />
      <PremiumNav variant="solid" />

      <main style={{ background: "#050505", color: "#fff", position: "relative", overflow: "hidden" }}>
        <Hero count={data?.length ?? null} />

        <section>
          <div className="container-lg">
            <Reveal>
              <div style={{
                display: "flex", flexDirection: "column", gap: 16,
                background: "rgba(13,13,13,0.7)",
                backdropFilter: "blur(18px)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 20, padding: 20, marginBottom: 48,
              }}>
                <div style={{ position: "relative" }}>
                  <Search
                    size={15}
                    color="rgba(255,255,255,0.4)"
                    style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                  />
                  <input
                    placeholder="Search games, sports, venues…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      width: "100%", padding: "14px 18px 14px 48px",
                      fontSize: 14, background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 12, color: "#fff", outline: "none",
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(230,57,70,0.35)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
                    <SlidersHorizontal size={13} />
                    <span className="eyebrow" style={{ margin: 0, color: "rgba(255,255,255,0.4)" }}>Filter</span>
                    <AnimatePresence>
                      {hasFilters && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          onClick={() => { setFilters({}); setSearch(""); }}
                          style={{
                            marginLeft: "auto",
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "4px 12px", borderRadius: 100,
                            fontSize: 11, color: "rgba(255,255,255,0.55)",
                            background: "transparent",
                            border: "1px solid rgba(255,255,255,0.08)",
                            cursor: "pointer",
                          }}
                        >
                          <X size={11} /> Clear
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>

                  <PillGroup
                    label="Sport"
                    options={SPORTS.map(s => ({ v: s, l: s }))}
                    value={filters.sport}
                    onChange={v => set("sport", v)}
                  />
                  <PillGroup
                    label="Cost"
                    options={COSTS}
                    value={filters.cost}
                    onChange={v => set("cost", v)}
                  />
                </div>
              </div>
            </Reveal>

            {/* Meta */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 28, flexWrap: "wrap", gap: 12,
            }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", letterSpacing: "0.02em" }}>
                {isLoading
                  ? "Loading games…"
                  : error
                    ? "Couldn't load games"
                    : `${data?.length ?? 0} ${(data?.length ?? 0) === 1 ? "game" : "games"} available`}
              </span>
              {!isLoading && !error && (data?.length ?? 0) > 0 && (
                <Magnetic strength={6}>
                  <Link href="/learn" style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    fontSize: 12, fontWeight: 600,
                    color: "rgba(255,255,255,0.6)", textDecoration: "none",
                  }}>
                    Looking to train instead? <ArrowUpRight size={12} />
                  </Link>
                </Magnetic>
              )}
            </div>

            {/* Grid */}
            {isLoading ? (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 20,
              }}>
                {Array(6).fill(0).map((_, i) => <GameSkeleton key={i} />)}
              </div>
            ) : error ? (
              <div style={{
                padding: "80px 24px", textAlign: "center", borderRadius: 20,
                background: "rgba(239,68,68,0.04)",
                border: "1px solid rgba(239,68,68,0.15)",
              }}>
                <p style={{ color: "#f87171", fontSize: 15, fontWeight: 600 }}>
                  Failed to load games. Please refresh.
                </p>
              </div>
            ) : !data?.length ? (
              <div style={{ textAlign: "center", padding: "100px 0" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 20,
                  background: "rgba(230,57,70,0.08)",
                  border: "1px solid rgba(230,57,70,0.18)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 20,
                }}>
                  <Users size={24} color="#ff6b74" />
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8, letterSpacing: "-0.02em" }}>
                  No games yet today.
                </h3>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 28 }}>
                  Be the first to host — takes less than a minute.
                </p>
                <Magnetic strength={10}>
                  <Link href="/create-game" style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "14px 24px", borderRadius: 100,
                    background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                    color: "#fff", fontSize: 14, fontWeight: 700,
                    textDecoration: "none",
                    boxShadow: "0 0 28px rgba(230,57,70,0.35)",
                  }}>
                    <Plus size={15} /> Host a game
                  </Link>
                </Magnetic>
              </div>
            ) : (
              <Stagger
                stagger={0.05}
                y={24}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: 20,
                  marginBottom: 120,
                }}
              >
                {data.map(game => <GameCard key={game.id} game={game} />)}
              </Stagger>
            )}
          </div>
        </section>
      </main>

      <style>{`
        .game-card:hover { border-color: rgba(230,57,70,0.3); box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(230,57,70,0.12); transform: translateY(-4px); }
        .game-card:hover .game-card-img-wrap img { transform: scale(1.05); filter: saturate(1); }
        .game-card-img-wrap img { transition: transform 700ms cubic-bezier(0.16,1,0.3,1), filter 500ms; }
      `}</style>
    </>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div style={{ background: "#050505", minHeight: "100vh" }} />}>
      <PlayContent />
    </Suspense>
  );
}
