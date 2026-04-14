"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, Star, MapPin, Clock, DollarSign, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { AIBanner, Img, SkillBadge, SportBadge, SectionHeader } from "@/components/Shared";
import { Input, Skeleton } from "@/components/ui";
import { useCoaches, type CoachFilters } from "@/hooks/useData";

const SPORTS = ["Basketball", "Football", "Cricket", "Badminton", "Tennis", "Volleyball", "Fitness"];
const LEVELS = ["Beginner", "Intermediate", "Advanced", "All Levels"];
const TYPES  = ["Academy", "Personal Trainer"];

const ease = [0.16, 1, 0.3, 1] as const;

const cardVariants = {
  hidden:  { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.55, delay: i * 0.07, ease },
  }),
};

export default function LearnPage() {
  const [filters, setFilters] = useState<CoachFilters>({});
  const [search,  setSearch]  = useState("");
  const { data, isLoading, error } = useCoaches({ ...filters, q: search || undefined });

  const set = (k: keyof CoachFilters, v: string) =>
    setFilters(p => ({ ...p, [k]: v === "all" || !v ? undefined : v }));
  const hasFilters = Object.values(filters).some(Boolean) || !!search;

  return (
    <div style={{ minHeight: "100vh", background: "#050505" }}>
      <NavBar />

      {/* Background grid */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse 80% 50% at 50% 0%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 50% at 50% 0%, black, transparent)",
        }}
      />

      <main style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>

        {/* Header */}
        <SectionHeader
          title="Find Your Coach"
          subtitle="Quality coaches and academies in Kozhikode"
          badge="50+ Verified Coaches"
        />

        {/* AI Banner */}
        <AIBanner type="coaches" />

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search size={15} color="#52525b" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <Input
            style={{ paddingLeft: 42 }}
            placeholder="Search coaches, sports, locations…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#52525b" }}>
            <SlidersHorizontal size={13} />
            <span style={{ fontSize: 12, fontWeight: 500 }}>Filter:</span>
          </div>

          {/* Sport pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {["all", ...SPORTS].map(s => {
              const active = filters.sport === s || (s === "all" && !filters.sport);
              return (
                <motion.button
                  key={s}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => set("sport", s)}
                  style={{
                    padding: "5px 13px", borderRadius: 100, fontSize: 12, fontWeight: 500,
                    cursor: "pointer", border: "1px solid", fontFamily: "inherit",
                    background: active ? "rgba(230,57,70,0.1)" : "transparent",
                    color: active ? "#e63946" : "#71717a",
                    borderColor: active ? "rgba(230,57,70,0.3)" : "rgba(255,255,255,0.07)",
                    transition: "all 0.18s",
                  }}
                >
                  {s === "all" ? "All Sports" : s}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Level + Type + Clear */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 32, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#3f3f46", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Level</span>
            {["all", ...LEVELS].map(l => {
              const active = filters.skillLevel === l || (l === "all" && !filters.skillLevel);
              return (
                <motion.button
                  key={l}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => set("skillLevel", l)}
                  style={{
                    padding: "4px 11px", borderRadius: 100, fontSize: 12, fontWeight: 500,
                    cursor: "pointer", border: "1px solid", fontFamily: "inherit",
                    background: active ? "rgba(230,57,70,0.07)" : "transparent",
                    color: active ? "#e63946" : "#71717a",
                    borderColor: active ? "rgba(230,57,70,0.22)" : "rgba(255,255,255,0.06)",
                    transition: "all 0.18s",
                  }}
                >
                  {l === "all" ? "All" : l}
                </motion.button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#3f3f46", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Type</span>
            {["all", ...TYPES].map(t => {
              const active = filters.type === t || (t === "all" && !filters.type);
              return (
                <motion.button
                  key={t}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => set("type", t)}
                  style={{
                    padding: "4px 11px", borderRadius: 100, fontSize: 12, fontWeight: 500,
                    cursor: "pointer", border: "1px solid", fontFamily: "inherit",
                    background: active ? "rgba(230,57,70,0.07)" : "transparent",
                    color: active ? "#e63946" : "#71717a",
                    borderColor: active ? "rgba(230,57,70,0.22)" : "rgba(255,255,255,0.06)",
                    transition: "all 0.18s",
                  }}
                >
                  {t === "all" ? "All" : t}
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence>
            {hasFilters && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ scale: 1.04 }}
                onClick={() => { setFilters({}); setSearch(""); }}
                style={{
                  padding: "4px 13px", borderRadius: 100, fontSize: 12, color: "#71717a",
                  background: "transparent", border: "1px solid rgba(255,255,255,0.07)",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                ✕ Clear filters
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Result count */}
        <p style={{ fontSize: 12, color: "#3f3f46", marginBottom: 24, letterSpacing: "0.02em" }}>
          {isLoading ? "Loading…" : error ? "Failed to load" : `${data?.length ?? 0} ${(data?.length ?? 0) === 1 ? "coach" : "coaches"} found`}
        </p>

        {/* Grid */}
        <motion.div
          variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
          initial="hidden"
          animate="visible"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 16 }}
        >
          {isLoading
            ? Array(6).fill(0).map((_, i) => (
                <div key={i} style={{
                  background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 18, overflow: "hidden",
                }}>
                  <Skeleton style={{ height: 210, borderRadius: 0 }} />
                  <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                    <Skeleton style={{ height: 16, width: "65%" }} />
                    <Skeleton style={{ height: 12, width: "45%" }} />
                    <Skeleton style={{ height: 12, width: "55%" }} />
                    <Skeleton style={{ height: 12, width: "40%" }} />
                  </div>
                </div>
              ))
            : error
            ? (
              <p style={{ gridColumn: "1/-1", textAlign: "center", padding: "64px 0", color: "#ef4444", fontSize: 14 }}>
                Failed to load coaches. Please refresh.
              </p>
            )
            : !data?.length
            ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ gridColumn: "1/-1", textAlign: "center", padding: "80px 0" }}
              >
                <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
                <p style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No coaches found</p>
                <p style={{ color: "#52525b", fontSize: 14 }}>Try adjusting your filters</p>
              </motion.div>
            )
            : data.map((coach, i) => (
                <motion.div
                  key={coach.id}
                  custom={i}
                  variants={cardVariants}
                >
                  <Link href={`/coach/${coach.id}`} style={{ textDecoration: "none", display: "block", height: "100%" }}>
                    <motion.div
                      whileHover={{
                        y: -5,
                        borderColor: "rgba(230,57,70,0.28)",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(230,57,70,0.1)",
                      }}
                      transition={{ duration: 0.25, ease }}
                      style={{
                        background: "#0d0d0d",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 18, overflow: "hidden",
                        cursor: "pointer", height: "100%",
                        display: "flex", flexDirection: "column",
                      }}
                    >
                      {/* Image */}
                      <div style={{ position: "relative", height: 210, overflow: "hidden", flexShrink: 0 }}>
                        <Img
                          src={coach.imageUrl} alt={coach.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }}
                        />
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 45%, transparent 100%)" }} />

                        {/* Top badges */}
                        <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6 }}>
                          <SportBadge sport={coach.sport} />
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 100,
                            background: "rgba(0,0,0,0.6)", color: "#d4d4d8",
                            border: "1px solid rgba(255,255,255,0.12)",
                            backdropFilter: "blur(4px)",
                          }}>
                            {coach.type}
                          </span>
                        </div>

                        {coach.seatsLeft === 0 && (
                          <div style={{ position: "absolute", top: 12, right: 12 }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100,
                              background: "rgba(239,68,68,0.15)", color: "#ef4444",
                              border: "1px solid rgba(239,68,68,0.3)",
                            }}>
                              Full
                            </span>
                          </div>
                        )}

                        {/* Rating overlay */}
                        <div style={{ position: "absolute", bottom: 12, right: 12 }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "4px 10px", borderRadius: 8,
                            background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            fontSize: 13, fontWeight: 800, color: "#fff",
                          }}>
                            <Star size={11} fill="#eab308" color="#eab308" />
                            {coach.rating.toFixed(1)}
                            <span style={{ fontSize: 11, fontWeight: 400, color: "#71717a" }}>({coach.reviewCount})</span>
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 12, letterSpacing: "-0.02em" }}>
                          {coach.name}
                        </h3>

                        <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1, marginBottom: 16 }}>
                          {[
                            { Icon: MapPin,      v: coach.location, c: "#71717a" },
                            { Icon: DollarSign,  v: coach.price,    c: "#4ade80" },
                            { Icon: Clock,       v: coach.timing,   c: "#71717a" },
                          ].map(({ Icon, v, c }) => (
                            <div key={v} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                              <Icon size={12} color={c} style={{ flexShrink: 0 }} />
                              <span style={{ color: "#71717a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
                            </div>
                          ))}
                          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                            <Users size={12} color={coach.seatsLeft === 0 ? "#ef4444" : coach.seatsLeft <= 3 ? "#eab308" : "#52525b"} style={{ flexShrink: 0 }} />
                            <span style={{ color: coach.seatsLeft === 0 ? "#ef4444" : coach.seatsLeft <= 3 ? "#eab308" : "#71717a" }}>
                              {coach.seatsLeft === 0
                                ? "No seats available"
                                : `${coach.seatsLeft} seat${coach.seatsLeft !== 1 ? "s" : ""} left`}
                            </span>
                          </div>
                        </div>

                        {/* Footer row */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <SkillBadge level={coach.skillLevel} />
                          <span style={{
                            padding: "7px 16px", borderRadius: 9, fontSize: 12, fontWeight: 600,
                            background: coach.seatsLeft === 0
                              ? "transparent"
                              : "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                            color: coach.seatsLeft === 0 ? "#3f3f46" : "#fff",
                            border: coach.seatsLeft === 0 ? "1px solid rgba(255,255,255,0.07)" : "none",
                            pointerEvents: coach.seatsLeft === 0 ? "none" : "auto",
                            boxShadow: coach.seatsLeft === 0 ? "none" : "0 2px 10px rgba(230,57,70,0.25)",
                          }}>
                            {coach.seatsLeft === 0 ? "Full" : "View Details"}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              ))
          }
        </motion.div>
      </main>
    </div>
  );
}
