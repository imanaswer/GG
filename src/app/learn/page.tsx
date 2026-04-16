"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, Star, MapPin, Clock, Users, ArrowUpRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { PremiumNav } from "@/components/premium/PremiumNav";
import { SmoothScroll } from "@/components/premium/SmoothScroll";
import { Reveal, Stagger } from "@/components/premium/Reveal";
import { Magnetic } from "@/components/premium/Magnetic";
import { SkillBadge, SportBadge } from "@/components/Shared";
import { useCoaches, type Coach, type CoachFilters } from "@/hooks/useData";
import { STORY, pickFallback, COACH_FALLBACKS } from "@/lib/premium-images";

const SPORTS = ["Basketball", "Football", "Cricket", "Badminton", "Tennis", "Volleyball", "Fitness"] as const;
const LEVELS = ["Beginner", "Intermediate", "Advanced", "All Levels"] as const;
const TYPES  = ["Academy", "Personal Trainer"] as const;

/* ── Hero band ──────────────────────────────────────────── */

function Hero({ count }: { count: number | null }) {
  return (
    <section className="page-hero" style={{
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Backdrop */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.3 }}>
        <Image
          src={STORY.learn.src}
          alt={STORY.learn.alt}
          fill
          priority
          quality={80}
          sizes="100vw"
          style={{ objectFit: "cover", filter: "saturate(0.6) brightness(0.7)" }}
        />
      </div>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(5,5,5,0.6) 0%, rgba(5,5,5,0.3) 30%, #050505 100%)",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 70% 60% at 50% 30%, rgba(230,57,70,0.14), transparent 70%)",
      }} />

      <div className="container-lg" style={{ position: "relative" }}>
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
              {count !== null ? `${count} coaches live in Kozhikode` : "Verified coaches · Kozhikode"}
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.06}>
          <h1 className="display" style={{
            fontSize: "clamp(44px, 7vw, 104px)",
            color: "#fff",
            maxWidth: 1100,
          }}>
            Train with{" "}
            <span className="display-serif" style={{ color: "#ff6b74" }}>
              coaches
            </span>{" "}
            who sweat for it.
          </h1>
        </Reveal>

        <Reveal delay={0.14}>
          <p style={{
            fontSize: 18,
            color: "rgba(255,255,255,0.6)",
            maxWidth: 620, marginTop: 28,
            lineHeight: 1.6,
          }}>
            Every coach here has been verified in-person. Filter by sport, level
            and timing — book a trial in a couple of taps.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Filter pills ───────────────────────────────────────── */

type PillGroupProps = {
  label: string;
  options: readonly string[];
  value?: string;
  onChange: (v: string) => void;
  compact?: boolean;
};

function PillGroup({ label, options, value, onChange, compact }: PillGroupProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      {!compact && (
        <span className="eyebrow" style={{ marginRight: 8, fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
          {label}
        </span>
      )}
      {["all", ...options].map(opt => {
        const active = (value ?? "all") === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              padding: "6px 14px",
              borderRadius: 100,
              fontSize: 12, fontWeight: 500,
              cursor: "pointer",
              border: "1px solid",
              fontFamily: "inherit",
              background: active ? "rgba(230,57,70,0.12)" : "rgba(255,255,255,0.02)",
              color: active ? "#ff6b74" : "rgba(255,255,255,0.6)",
              borderColor: active ? "rgba(230,57,70,0.35)" : "rgba(255,255,255,0.07)",
              transition: "all 180ms",
            }}
          >
            {opt === "all" ? `All ${label.toLowerCase()}` : opt}
          </button>
        );
      })}
    </div>
  );
}

/* ── Coach card ─────────────────────────────────────────── */

function CoachCard({ coach }: { coach: Coach }) {
  const full = coach.seatsLeft === 0;
  const img = coach.imageUrl || pickFallback(COACH_FALLBACKS, coach.id).src;

  return (
    <Link
      href={`/coach/${coach.id}`}
      data-stagger
      style={{ textDecoration: "none", display: "block", height: "100%" }}
    >
      <motion.div
        whileHover="hover"
        initial="rest"
        variants={{ rest: {}, hover: {} }}
        style={{
          position: "relative",
          height: "100%",
          display: "flex", flexDirection: "column",
          background: "#0a0a0a",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 20,
          overflow: "hidden",
          transition: "border-color 300ms, box-shadow 300ms",
        }}
        onHoverStart={(e) => {
          const el = e.currentTarget as HTMLElement | null;
          if (!el) return;
          el.style.borderColor = "rgba(230,57,70,0.3)";
          el.style.boxShadow = "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(230,57,70,0.1)";
        }}
        onHoverEnd={(e) => {
          const el = e.currentTarget as HTMLElement | null;
          if (!el) return;
          el.style.borderColor = "rgba(255,255,255,0.06)";
          el.style.boxShadow = "";
        }}
      >
        {/* Image */}
        <div style={{ position: "relative", aspectRatio: "4/5", overflow: "hidden" }}>
          <motion.div
            variants={{ rest: { scale: 1 }, hover: { scale: 1.05 } }}
            transition={{ duration: 0.7, ease: [0.16,1,0.3,1] }}
            style={{ position: "absolute", inset: 0 }}
          >
            <Image
              src={img}
              alt={coach.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw"
              style={{ objectFit: "cover", filter: "saturate(0.85)" }}
            />
          </motion.div>

          {/* Top-left badges */}
          <div style={{
            position: "absolute", top: 14, left: 14, display: "flex", gap: 6,
          }}>
            <SportBadge sport={coach.sport} />
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 100,
              background: "rgba(0,0,0,0.65)", color: "#e4e4e7",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(6px)",
            }}>
              {coach.type}
            </span>
          </div>

          {full && (
            <div style={{ position: "absolute", top: 14, right: 14 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 100,
                background: "rgba(239,68,68,0.18)", color: "#fca5a5",
                border: "1px solid rgba(239,68,68,0.3)",
                backdropFilter: "blur(6px)",
              }}>
                Fully booked
              </span>
            </div>
          )}

          {/* Bottom gradient + rating */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.85) 100%)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: 16, left: 16, right: 16,
            display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          }}>
            <h3 style={{
              fontSize: 22, fontWeight: 800, color: "#fff",
              letterSpacing: "-0.025em", margin: 0,
              textShadow: "0 2px 20px rgba(0,0,0,0.6)",
            }}>
              {coach.name}
            </h3>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "5px 10px", borderRadius: 10,
              background: "rgba(0,0,0,0.65)",
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(8px)",
              fontSize: 12, fontWeight: 700, color: "#fff",
            }}>
              <Star size={11} fill="#eab308" color="#eab308" />
              {coach.rating.toFixed(1)}
              <span style={{ fontSize: 10, fontWeight: 400, color: "rgba(255,255,255,0.55)" }}>
                ({coach.reviewCount})
              </span>
            </span>
          </div>
        </div>

        {/* Meta */}
        <div style={{ padding: "22px 22px 24px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
            {[
              { Icon: MapPin, v: coach.location, c: "rgba(255,255,255,0.55)" },
              { Icon: Clock,  v: coach.timing,   c: "rgba(255,255,255,0.55)" },
            ].map(({ Icon, v, c }) => (
              <div key={v} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                <Icon size={13} color={c} style={{ flexShrink: 0 }} />
                <span style={{ color: c, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {v}
                </span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
              <Users
                size={13}
                color={full ? "#f87171" : coach.seatsLeft <= 3 ? "#eab308" : "rgba(255,255,255,0.4)"}
                style={{ flexShrink: 0 }}
              />
              <span style={{
                color: full ? "#f87171" : coach.seatsLeft <= 3 ? "#fbbf24" : "rgba(255,255,255,0.55)",
              }}>
                {full
                  ? "No seats available"
                  : `${coach.seatsLeft} seat${coach.seatsLeft !== 1 ? "s" : ""} left`}
              </span>
            </div>
          </div>

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <SkillBadge level={coach.skillLevel} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#4ade80" }}>
                {coach.price}
              </span>
            </div>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 12, fontWeight: 600,
              color: full ? "rgba(255,255,255,0.3)" : "#fff",
            }}>
              {full ? "Full" : "Details"}
              {!full && <ArrowUpRight size={13} />}
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

/* ── Skeleton ───────────────────────────────────────────── */

function CoachSkeleton() {
  return (
    <div style={{
      background: "#0a0a0a",
      border: "1px solid rgba(255,255,255,0.05)",
      borderRadius: 20, overflow: "hidden",
      height: "100%",
    }}>
      <div className="skeleton" style={{ aspectRatio: "4/5", borderRadius: 0 }} />
      <div style={{ padding: "22px 22px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="skeleton" style={{ height: 14, width: "60%", borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 12, width: "45%", borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 12, width: "50%", borderRadius: 6 }} />
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────── */

function LearnContent() {
  const searchParams = useSearchParams();
  const initialSport = searchParams.get("sport") || undefined;

  const [filters, setFilters] = useState<CoachFilters>(
    initialSport ? { sport: initialSport } : {},
  );
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 260);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error } = useCoaches({ ...filters, q: debounced || undefined });

  const set = (k: keyof CoachFilters, v: string) =>
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

        {/* Search + filters */}
        <section style={{ position: "relative", zIndex: 2 }}>
          <div className="container-lg">
            <Reveal>
              <div style={{
                display: "flex", flexDirection: "column", gap: 16,
                background: "rgba(13,13,13,0.7)",
                backdropFilter: "blur(18px)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 20,
                padding: 20,
                marginBottom: 48,
              }}>
                {/* Search row */}
                <div style={{ position: "relative" }}>
                  <Search
                    size={15}
                    color="rgba(255,255,255,0.4)"
                    style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                  />
                  <input
                    placeholder="Search coaches, sports, academies, locations…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "14px 18px 14px 48px",
                      fontSize: 14,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 12,
                      color: "#fff",
                      outline: "none",
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(230,57,70,0.35)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
                  />
                </div>

                {/* Filter rows */}
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

                  <PillGroup label="Sport"     options={SPORTS} value={filters.sport}      onChange={v => set("sport", v)} />
                  <PillGroup label="Level"     options={LEVELS} value={filters.skillLevel} onChange={v => set("skillLevel", v)} />
                  <PillGroup label="Type"      options={TYPES}  value={filters.type}       onChange={v => set("type", v)} />
                </div>
              </div>
            </Reveal>

            {/* Result meta */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 28, flexWrap: "wrap", gap: 12,
            }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", letterSpacing: "0.02em" }}>
                {isLoading
                  ? "Loading coaches…"
                  : error
                    ? "Couldn't load coaches"
                    : `${data?.length ?? 0} ${(data?.length ?? 0) === 1 ? "coach" : "coaches"} found`}
              </span>
              {!isLoading && !error && (data?.length ?? 0) > 0 && (
                <Magnetic strength={6}>
                  <Link href="/play" style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    fontSize: 12, fontWeight: 600,
                    color: "rgba(255,255,255,0.6)",
                    textDecoration: "none",
                  }}>
                    Looking to play instead? <ArrowUpRight size={12} />
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
                {Array(6).fill(0).map((_, i) => <CoachSkeleton key={i} />)}
              </div>
            ) : error ? (
              <div style={{
                padding: "80px 24px",
                textAlign: "center",
                borderRadius: 20,
                background: "rgba(239,68,68,0.04)",
                border: "1px solid rgba(239,68,68,0.15)",
              }}>
                <p style={{ color: "#f87171", fontSize: 15, fontWeight: 600 }}>
                  Failed to load coaches. Please refresh.
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
                  <Search size={24} color="#ff6b74" />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
                  No coaches matched.
                </h3>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
                  Try loosening a filter or clearing search.
                </p>
              </div>
            ) : (
              <Stagger
                stagger={0.06}
                y={24}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: 20,
                  marginBottom: 120,
                }}
              >
                {data.map(coach => <CoachCard key={coach.id} coach={coach} />)}
              </Stagger>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

export default function LearnPage() {
  return (
    <Suspense fallback={<div style={{ background: "#050505", minHeight: "100vh" }} />}>
      <LearnContent />
    </Suspense>
  );
}
