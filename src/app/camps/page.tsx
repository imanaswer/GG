"use client";
import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, Suspense } from "react";
import { Search, Filter, Clock, Users, Star, Target, Award, Sparkles, ChevronRight, Calendar, MapPin, SlidersHorizontal, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { PremiumNav } from "@/components/premium/PremiumNav";
import { SmoothScroll } from "@/components/premium/SmoothScroll";
import { Reveal, Stagger } from "@/components/premium/Reveal";
import { Magnetic } from "@/components/premium/Magnetic";
import { Tilt3D } from "@/components/premium/Tilt3D";
import { useCamps, type Camp, type CampFilters } from "@/hooks/useData";
import { CAMP_IMAGE } from "@/lib/premium-images";

const SPORTS    = ["Basketball","Football","Badminton","Cricket","Tennis","Fitness","Multi-Sport"] as const;
const LEVELS    = [
  { v: "Beginner",     l: "Beginner" },
  { v: "Intermediate", l: "Intermediate" },
  { v: "Advanced",     l: "Advanced" },
  { v: "All Levels",   l: "All levels" },
] as const;
const DURATIONS = [
  { v: "short",  l: "1–5 days"  },
  { v: "medium", l: "6–10 days" },
  { v: "long",   l: "10+ days"  },
] as const;
const AGE_GROUPS = [
  { v: "6–12 years",  l: "6–12 years"  },
  { v: "10–16 years", l: "10–16 years" },
  { v: "12–18 years", l: "12–18 years" },
  { v: "15–25 years", l: "15–25 years" },
] as const;

/* ── Spots badge ───────────────────────────────────────── */
function spotsLabel(p: number, max: number) {
  const left = max - p;
  if (left <= 0) return { text: "Full",                bg: "rgba(239,68,68,0.92)", fg: "#fff" };
  if (left <= 5) return { text: `Only ${left} left`,  bg: "rgba(234,179,8,0.92)", fg: "#000" };
  return             { text: `${left} spots left`, bg: "rgba(34,197,94,0.9)",  fg: "#000" };
}

/* ── Hero ──────────────────────────────────────────────── */

function Hero({ count }: { count: number | null }) {
  return (
    <section className="page-hero" style={{
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.3 }}>
        <Image
          src={CAMP_IMAGE.src}
          alt={CAMP_IMAGE.alt}
          fill priority quality={80} sizes="100vw"
          style={{ objectFit: "cover", filter: "saturate(0.6) brightness(0.65)" }}
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
              <Sparkles size={13} color="#e63946" />
              <span style={{
                fontSize: 11, fontWeight: 600, letterSpacing: "0.16em",
                textTransform: "uppercase", color: "#ff6b74",
              }}>
                {count !== null ? `${count} intensive camp${count === 1 ? "" : "s"} open` : "Training camps · Kozhikode"}
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <h1 className="display" style={{
              fontSize: "clamp(44px, 7vw, 104px)",
              color: "#fff", maxWidth: 1100,
            }}>
              Transform in{" "}
              <span className="display-serif" style={{ color: "#ff6b74" }}>days,</span>{" "}
              not seasons.
            </h1>
          </Reveal>

          <Reveal delay={0.14}>
            <p style={{
              fontSize: 18, color: "rgba(255,255,255,0.6)",
              maxWidth: 640, marginTop: 28, lineHeight: 1.6,
            }}>
              Multi-day intensives led by working coaches. Small squads, structured blocks,
              tangible progress by the time you leave.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.22}>
          <Magnetic strength={10}>
            <Link href="#camps" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "14px 22px", borderRadius: 100,
              background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
              boxShadow: "0 0 32px rgba(230,57,70,0.4)",
              color: "#fff", fontSize: 14, fontWeight: 700,
              textDecoration: "none",
            }}>
              Browse camps
              <ChevronRight size={15} />
            </Link>
          </Magnetic>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Pill filter group ─────────────────────────────────── */

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

/* ── Featured camp card (wide, 2-col grid) ─────────────── */

function FeaturedCard({ camp }: { camp: Camp }) {
  const sl = spotsLabel(camp.participants, camp.maxParticipants);
  const img = camp.imageUrl || CAMP_IMAGE.src;

  return (
    <Tilt3D intensity={6} data-stagger style={{ height: "100%", borderRadius: 24 }}>
    <Link
      data-stagger
      href={`/camps/${camp.id}`}
      className="camp-card camp-card-featured"
      style={{
        textDecoration: "none", display: "flex", flexDirection: "column",
        background: "#0a0a0a",
        border: "1px solid rgba(230,57,70,0.3)",
        borderRadius: 24, overflow: "hidden",
        transition: "border-color 300ms, box-shadow 300ms, transform 300ms",
        height: "100%",
      }}
    >
      <div style={{ position: "relative", aspectRatio: "16/10", overflow: "hidden" }}>
        <div className="camp-card-img" style={{ position: "absolute", inset: 0 }}>
          <Image
            src={img} alt={camp.title}
            fill
            sizes="(max-width: 900px) 100vw, 50vw"
            style={{ objectFit: "cover", filter: "saturate(0.85)" }}
          />
        </div>

        {/* Featured badge */}
        <div style={{
          position: "absolute", top: 16, left: 16,
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "5px 12px", borderRadius: 100,
          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          fontSize: 11, fontWeight: 800, color: "#000",
          boxShadow: "0 4px 20px rgba(245,158,11,0.5)",
          letterSpacing: "0.04em",
        }}>
          <Sparkles size={11} />Featured
        </div>

        {/* Spots badge */}
        <div style={{
          position: "absolute", top: 16, right: 16,
          padding: "5px 12px", borderRadius: 100,
          background: sl.bg, color: sl.fg,
          fontSize: 11, fontWeight: 700,
          backdropFilter: "blur(8px)",
        }}>
          {sl.text}
        </div>

        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.85) 100%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "absolute", bottom: 18, left: 20, right: 20 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 100,
              background: "rgba(230,57,70,0.95)", color: "#fff",
            }}>{camp.sport}</span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 100,
              background: "rgba(0,0,0,0.55)", color: "#fff",
              border: "1px solid rgba(255,255,255,0.18)",
              backdropFilter: "blur(8px)",
            }}>{camp.duration}</span>
          </div>
          <h3 style={{
            fontSize: 24, fontWeight: 800, color: "#fff",
            letterSpacing: "-0.02em", lineHeight: 1.2, margin: 0,
            textShadow: "0 2px 16px rgba(0,0,0,0.5)",
          }}>
            {camp.title}
          </h3>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Star size={14} color="#e63946" fill="#e63946" />
            <span style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{camp.rating}</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>({camp.reviews})</span>
          </div>
          <span style={{
            fontSize: 11, padding: "3px 9px", borderRadius: 100,
            background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.55)",
            fontWeight: 600, border: "1px solid rgba(255,255,255,0.06)",
          }}>{camp.skillLevel}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {[
            { Icon: Calendar, v: camp.dates },
            { Icon: MapPin,   v: camp.location },
            { Icon: Users,    v: `${camp.ageGroup} · ${camp.participants}/${camp.maxParticipants} enrolled` },
          ].map(({ Icon, v }) => (
            <div key={v} style={{
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 13, color: "rgba(255,255,255,0.6)",
            }}>
              <Icon size={13} color="#e63946" style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
            </div>
          ))}
        </div>

        {camp.highlights.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {camp.highlights.slice(0, 3).map((h, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                fontSize: 12.5, color: "rgba(255,255,255,0.5)",
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: "#e63946", flexShrink: 0,
                }} />
                {h}
              </div>
            ))}
          </div>
        )}

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "auto",
        }}>
          <div>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 3 }}>
              Total
            </p>
            <p style={{ fontSize: 26, fontWeight: 800, color: "#ff6b74", letterSpacing: "-0.03em", margin: 0 }}>
              {camp.priceDisplay}
            </p>
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "11px 20px", borderRadius: 100,
            background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
            color: "#fff", fontSize: 13, fontWeight: 700,
            boxShadow: "0 2px 18px rgba(230,57,70,0.3)",
          }}>
            Register
            <ChevronRight size={14} />
          </div>
        </div>
      </div>
    </Link>
    </Tilt3D>
  );
}

/* ── Compact camp card ─────────────────────────────────── */

function CompactCard({ camp }: { camp: Camp }) {
  const sl = spotsLabel(camp.participants, camp.maxParticipants);
  const img = camp.imageUrl || CAMP_IMAGE.src;

  return (
    <Tilt3D intensity={8} data-stagger style={{ height: "100%", borderRadius: 20 }}>
    <Link
      data-stagger
      href={`/camps/${camp.id}`}
      className="camp-card camp-card-compact"
      style={{
        textDecoration: "none", display: "flex", flexDirection: "column",
        background: "#0a0a0a",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 20, overflow: "hidden",
        transition: "border-color 300ms, box-shadow 300ms, transform 300ms",
        height: "100%",
      }}
    >
      <div style={{ position: "relative", aspectRatio: "5/4", overflow: "hidden" }}>
        <div className="camp-card-img" style={{ position: "absolute", inset: 0 }}>
          <Image
            src={img} alt={camp.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ objectFit: "cover", filter: "saturate(0.85)" }}
          />
        </div>

        <div style={{
          position: "absolute", top: 12, right: 12,
          padding: "3px 10px", borderRadius: 100,
          background: sl.bg, color: sl.fg,
          fontSize: 10, fontWeight: 700,
          backdropFilter: "blur(8px)",
        }}>{sl.text}</div>

        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.78) 100%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "absolute", bottom: 12, left: 14, right: 14 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 100,
            background: "rgba(0,0,0,0.55)", color: "#fff",
            border: "1px solid rgba(255,255,255,0.18)",
            backdropFilter: "blur(8px)",
          }}>
            {camp.duration}
          </span>
        </div>
      </div>

      <div style={{ padding: "16px 18px 20px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 100,
            background: "rgba(230,57,70,0.14)", color: "#ff6b74",
            letterSpacing: "0.04em",
          }}>{camp.sport}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Star size={11} color="#e63946" fill="#e63946" />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{camp.rating}</span>
          </div>
        </div>

        <h3 style={{
          fontSize: 15.5, fontWeight: 800, color: "#fff",
          lineHeight: 1.3, letterSpacing: "-0.01em", margin: 0,
        }}>
          {camp.title}
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            <Calendar size={12} color="#e63946" style={{ flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{camp.dates}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            <Users size={12} color="#e63946" style={{ flexShrink: 0 }} />
            <span>{camp.ageGroup}</span>
          </div>
        </div>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: "auto",
        }}>
          <div>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
              Price
            </p>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#ff6b74", letterSpacing: "-0.02em", margin: 0 }}>
              {camp.priceDisplay}
            </p>
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "7px 14px", borderRadius: 100,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.78)", fontSize: 11, fontWeight: 600,
          }}>
            Details<ChevronRight size={12} />
          </div>
        </div>
      </div>
    </Link>
    </Tilt3D>
  );
}

/* ── Skeleton ──────────────────────────────────────────── */
function CampSkeleton({ aspect = "5/4" }: { aspect?: string }) {
  return (
    <div style={{
      background: "#0a0a0a",
      border: "1px solid rgba(255,255,255,0.05)",
      borderRadius: 20, overflow: "hidden", height: "100%",
    }}>
      <div className="skeleton" style={{ aspectRatio: aspect, borderRadius: 0 }} />
      <div style={{ padding: "16px 18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="skeleton" style={{ height: 14, width: "65%", borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 12, width: "45%", borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 22, width: "40%", borderRadius: 6 }} />
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────── */

function CampsContent() {
  const [filters, setFilters] = useState<CampFilters>({});
  const [search, setSearch]   = useState("");
  const { data, isLoading, error } = useCamps({ ...filters, q: search || undefined });

  const featured = useMemo(() => data?.filter(c => c.featured) ?? [], [data]);
  const regular  = useMemo(() => data?.filter(c => !c.featured) ?? [], [data]);

  const set = (k: keyof CampFilters, v: string) =>
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

        <section id="camps">
          <div className="container-lg">
            {/* Glass filter */}
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
                    size={15} color="rgba(255,255,255,0.4)"
                    style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                  />
                  <input
                    placeholder="Search camps by name, sport, or location…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      width: "100%", padding: "14px 18px 14px 48px",
                      fontSize: 14, background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 12, color: "#fff", outline: "none",
                      fontFamily: "inherit",
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
                            cursor: "pointer", fontFamily: "inherit",
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
                    label="Level"
                    options={LEVELS}
                    value={filters.skillLevel}
                    onChange={v => set("skillLevel", v)}
                  />
                  <PillGroup
                    label="Duration"
                    options={DURATIONS}
                    value={filters.duration}
                    onChange={v => set("duration", v)}
                  />
                  <PillGroup
                    label="Age"
                    options={AGE_GROUPS}
                    value={filters.ageGroup}
                    onChange={v => set("ageGroup", v)}
                  />
                </div>
              </div>
            </Reveal>

            {/* Meta row */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 28, flexWrap: "wrap", gap: 12,
            }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                {isLoading
                  ? "Loading camps…"
                  : error
                    ? "Couldn't load camps"
                    : `${data?.length ?? 0} ${(data?.length ?? 0) === 1 ? "camp" : "camps"} available`}
              </span>
            </div>

            {/* Content */}
            {isLoading ? (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 20,
              }}>
                {Array(6).fill(0).map((_, i) => <CampSkeleton key={i} />)}
              </div>
            ) : error ? (
              <div style={{
                padding: "80px 24px", textAlign: "center", borderRadius: 20,
                background: "rgba(239,68,68,0.04)",
                border: "1px solid rgba(239,68,68,0.15)",
              }}>
                <p style={{ color: "#f87171", fontSize: 15, fontWeight: 600 }}>
                  Failed to load camps. Please refresh.
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
                  <Target size={24} color="#ff6b74" />
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8, letterSpacing: "-0.02em" }}>
                  No camps match those filters.
                </h3>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
                  Try a different sport, level, or clear the filters.
                </p>
              </div>
            ) : (
              <>
                {/* Featured */}
                {featured.length > 0 && (
                  <div style={{ marginBottom: 72 }}>
                    <Reveal>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                        <Award size={20} color="#e63946" />
                        <h2 className="display" style={{
                          fontSize: "clamp(24px, 3vw, 32px)",
                          color: "#fff", margin: 0,
                        }}>
                          Featured camps
                        </h2>
                      </div>
                    </Reveal>
                    <Stagger
                      stagger={0.06}
                      y={24}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))",
                        gap: 24,
                      }}
                    >
                      {featured.map(c => <FeaturedCard key={c.id} camp={c} />)}
                    </Stagger>
                  </div>
                )}

                {/* All */}
                {regular.length > 0 && (
                  <div style={{ marginBottom: 120 }}>
                    <Reveal>
                      <h2 className="display" style={{
                        fontSize: "clamp(24px, 3vw, 32px)",
                        color: "#fff", marginBottom: 24,
                      }}>
                        All camps
                      </h2>
                    </Reveal>
                    <Stagger
                      stagger={0.05}
                      y={24}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                        gap: 20,
                      }}
                    >
                      {regular.map(c => <CompactCard key={c.id} camp={c} />)}
                    </Stagger>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <style>{`
        .camp-card:hover {
          border-color: rgba(230,57,70,0.3);
          box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(230,57,70,0.12);
          transform: translateY(-4px);
        }
        .camp-card-featured:hover {
          border-color: rgba(230,57,70,0.5);
          box-shadow: 0 30px 80px rgba(230,57,70,0.18), 0 0 0 1px rgba(230,57,70,0.2);
        }
        .camp-card-img img { transition: transform 700ms cubic-bezier(0.16,1,0.3,1), filter 500ms; }
        .camp-card:hover .camp-card-img img { transform: scale(1.05); filter: saturate(1); }
      `}</style>
    </>
  );
}

export default function CampsPage() {
  return (
    <Suspense fallback={<div style={{ background: "#050505", minHeight: "100vh" }} />}>
      <CampsContent />
    </Suspense>
  );
}
