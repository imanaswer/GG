"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useMemo, useEffect, Suspense, startTransition, useRef } from "react";
import { Search, SlidersHorizontal, Star, MapPin, Clock, Users, ArrowUpRight, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { PremiumNav } from "@/components/premium/PremiumNav";
import { SmoothScroll } from "@/components/premium/SmoothScroll";
import { Reveal, Stagger } from "@/components/premium/Reveal";
import { Magnetic } from "@/components/premium/Magnetic";
import { Tilt3D } from "@/components/premium/Tilt3D";
import { SkillBadge, SportBadge } from "@/components/Shared";
import { NearMeToggle } from "@/components/NearMeToggle";
import { useCoaches, type Coach, type CoachFilters } from "@/hooks/useData";
import { STORY, pickFallback, COACH_FALLBACKS } from "@/lib/premium-images";
import { distanceKm, sortByDistance, formatKm, type Coords } from "@/lib/maps";
import { LiquidImage } from "@/components/premium/LiquidImage";

const SPORTS = ["Basketball", "Football", "Cricket", "Badminton", "Tennis", "Volleyball", "Fitness"] as const;
const LEVELS = ["Beginner", "Intermediate", "Advanced", "All Levels"] as const;
const TYPES  = ["Academy", "Personal Trainer"] as const;

/* â”€â”€ Hero band â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function Hero({ count }: { count: number | null }) {
  return (
    <section className="page-hero" style={{
      position: "relative",
      overflow: "hidden",
      paddingBottom: 24, // Override global page-hero to reduce gap
    }}>


      <div className="container-lg" style={{ position: "relative", zIndex: 10 }}>
        <Reveal>
          <Magnetic strength={20}>
            <motion.div 
              style={{
                position: "relative",
                display: "inline-flex", alignItems: "center", gap: 12,
                padding: "8px 22px", borderRadius: 100,
                background: "rgba(20, 20, 20, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                marginBottom: 28,
                cursor: "pointer",
                backdropFilter: "blur(12px)",
                boxShadow: "inset 0 1px 1px rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.4)",
                overflow: "hidden"
              }}
              whileHover={{ 
                scale: 1.02,
                borderColor: "rgba(255, 255, 255, 0.3)",
                background: "rgba(30, 30, 30, 0.5)"
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {/* Continuous sweep shimmer effect */}
              <motion.div
                style={{
                  position: "absolute",
                  top: 0, left: "-100%", bottom: 0, width: "100%",
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
                  zIndex: 0
                }}
                animate={{ x: ["0%", "200%"] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
              />

              <span style={{
                position: "relative", zIndex: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 6, height: 6,
              }}>
                <span style={{
                  position: "absolute",
                  width: "100%", height: "100%",
                  borderRadius: "50%",
                  background: "#FFFFFF",
                  opacity: 0.8,
                  animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
                }} />
                <span style={{
                  position: "relative",
                  width: 4, height: 4, borderRadius: "50%",
                  background: "#FFFFFF", 
                  boxShadow: "0 0 8px 2px rgba(255, 255, 255, 0.8)",
                }} />
              </span>
              
              <span style={{
                position: "relative", zIndex: 1,
                fontFamily: "var(--font-sans), sans-serif",
                fontSize: "11px", 
                fontWeight: 600, 
                letterSpacing: "0.2em",
                textTransform: "uppercase", 
                color: "rgba(255,255,255,0.9)",
                transform: "translateY(1px)",
              }}>
                {count !== null ? `${count} coaches live in Kozhikode` : "Verified coaches · Kozhikode"}
              </span>
            </motion.div>
          </Magnetic>
        </Reveal>

        <div style={{ padding: "20px 0 20px 0" }}>
          <h1 className="display" style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(32px, 7.5vw, 130px)",
            lineHeight: 0.9,
            letterSpacing: "-0.01em",
            color: "#fff",
            width: "100%",
            margin: 0,
            display: "flex", flexDirection: "column", gap: "10px"
          }}>
            <motion.div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
              <motion.div initial={{ y: "100%", rotateZ: 4, opacity: 0 }} animate={{ y: "0%", rotateZ: 0, opacity: 1 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}>
                Train with <span style={{ color: "var(--text3)", fontStyle: "italic", paddingRight: "10px" }}>coaches</span> who
              </motion.div>
            </motion.div>
            <motion.div style={{ overflow: "hidden" }}>
              <motion.div initial={{ y: "100%", rotateZ: 4, opacity: 0 }} animate={{ y: "0%", rotateZ: 0, opacity: 1 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}>
                sweat for it.
              </motion.div>
            </motion.div>
          </h1>

          <Reveal delay={0.4}>
            <p style={{
              fontSize: "clamp(16px, 1.5vw, 20px)",
              color: "rgba(255,255,255,0.6)",
              maxWidth: 580, marginTop: 20,
              lineHeight: 1.6,
              fontWeight: 400,
            }}>
              Every coach here has been verified in-person. Filter by sport, level
              and timing — book a trial in a couple of taps.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* â”€â”€ Filter pills â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function formatSportName(text: string) {
  if (!text) return "";
  if (text === "BOXING/KICK") return "Boxing/Kick";
  // Fallback title case for other sports if needed, though they are fine
  return text.split('/').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('/');
}

type ToolbarDropdownProps = {
  label: string;
  options: readonly string[];
  value?: string;
  onChange: (v: string) => void;
  align?: "left" | "center" | "right";
};

function ToolbarDropdown({ label, options, value, onChange, align = "left" }: ToolbarDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="toolbar-dropdown-wrapper" style={{ position: "relative", height: "100%", display: "flex", alignItems: "center", padding: "0 24px" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", flexDirection: "column", alignItems: "flex-start",
          background: "transparent", border: "none", cursor: "pointer",
          padding: 0, textAlign: "left", gap: 2, outline: "none"
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
          {label}
        </span>
        <span style={{ fontSize: 14, fontWeight: 500, color: value ? "#fff" : "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
          {value ? (label === "Sport" ? formatSportName(value) : value) : `Any ${label}`}
          <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.4)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              top: "100%",
              left: align === "left" ? 0 : align === "center" ? "50%" : "auto",
              right: align === "right" ? 0 : "auto",
              marginLeft: align === "center" ? -100 : 0,
              marginTop: 16,
              background: "#111111", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16, padding: 8, minWidth: 200, zIndex: 50,
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
            }}
          >
            <button
              onClick={() => { onChange("all"); setOpen(false); }}
              style={{
                width: "100%", textAlign: "left", padding: "10px 16px",
                background: !value ? "rgba(255,255,255,0.05)" : "transparent",
                border: "none", borderRadius: 8, cursor: "pointer", outline: "none",
                color: !value ? "#fff" : "rgba(255,255,255,0.6)",
                fontSize: 14, fontWeight: 500
              }}
            >
              Any {label}
            </button>
            {options.map(opt => {
              const active = value === opt;
              return (
                <button
                  key={opt}
                  onClick={() => { onChange(opt); setOpen(false); }}
                  style={{
                    width: "100%", textAlign: "left", padding: "10px 16px",
                    background: active ? "rgba(255,255,255,0.05)" : "transparent",
                    border: "none", borderRadius: 8, cursor: "pointer", outline: "none",
                    color: active ? "#fff" : "rgba(255,255,255,0.6)",
                    fontSize: 14, fontWeight: 500
                  }}
                >
                  {label === "Sport" ? formatSportName(opt) : opt}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* â”€â”€ Coach card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function CoachCard({ coach, origin }: { coach: Coach; origin: Coords | null }) {
  const full = coach.seatsLeft === 0;
  const img = coach.imageUrl || pickFallback(COACH_FALLBACKS, coach.id).src;
  const km = origin ? distanceKm(origin, coach) : null;
  
  const getThemeColor = (sport: string) => {
    const s = sport.toLowerCase();
    if (s.includes("tennis")) return "#06b6d4"; 
    if (s.includes("fitness") || s.includes("cali")) return "#fff"; 
    if (s.includes("box") || s.includes("kick")) return "#f59e0b"; 
    if (s.includes("badminton")) return "#a855f7"; 
    if (s.includes("football") || s.includes("soccer")) return "#22c55e"; 
    if (s.includes("basket")) return "#f97316"; 
    return "#3b82f6";
  };
  const themeColor = getThemeColor(coach.sport);

  return (
    <Link
      href={`/coach/${coach.id}`}
      data-stagger
      style={{ textDecoration: "none", display: "block", height: "100%" }}
    >
      <Tilt3D intensity={8} style={{ height: "100%", borderRadius: 20 }}>
      <motion.div
        whileHover="hover"
        initial="rest"
        variants={{ rest: {}, hover: {} }}
        style={{
          position: "relative",
          height: "100%",
          display: "flex", flexDirection: "column",
          background: "#0D0D0D",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 20,
          overflow: "hidden",
          transition: "border-color 300ms, box-shadow 300ms, transform 400ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onHoverStart={(e) => {
          const el = e.currentTarget as HTMLElement | null;
          if (!el) return;
          el.style.borderColor = "rgba(255,255,255,0.2)";
          el.style.transform = "translateY(-8px)";
        }}
        onHoverEnd={(e) => {
          const el = e.currentTarget as HTMLElement | null;
          if (!el) return;
          el.style.borderColor = "rgba(255,255,255,0.06)";
          el.style.transform = "translateY(0)";
        }}
      >
        {/* Top Image Section */}
        {/* Top Image Section */}
        <div className="coach-card-img" style={{ position: "relative", width: "100%", overflow: "hidden" }}>
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
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(13,13,13,0) 40%, #0D0D0D 100%)", pointerEvents: "none" }} />
          
          <div className="coach-badge" style={{
            position: "absolute", top: 16, left: 16,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.1)", color: "white",
            padding: "6px 12px", borderRadius: 100, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em"
          }}>
            {formatSportName(coach.sport)}
          </div>

          <div className="coach-badge" style={{
            position: "absolute", top: 16, right: 16,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "6px 8px", gap: 6, color: "white", fontSize: 11, fontWeight: 700
          }}>
            <Star size={12} color={themeColor} fill={themeColor} />
            {coach.rating.toFixed(1)}
          </div>
        </div>

        {/* Content Section */}
        <div className="coach-card-content" style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
          <h3 className="coach-card-title" style={{ fontFamily: "'Instrument Serif', serif", color: "white", margin: "0 0 8px 0", lineHeight: 1.1 }}>
            {coach.name}
          </h3>
          <p className="coach-card-type" style={{ color: "#A3A3A3", fontSize: 14, lineHeight: 1.5, margin: "0 0 24px 0" }}>
            {coach.type} • {coach.skillLevel}
          </p>
          
          <ul className="coach-card-list" style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column" }}>
            <li className="coach-card-list-item" style={{ color: "#E5E5E5", display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: themeColor, flexShrink: 0, marginTop: 5 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {coach.address || coach.location} {km != null ? `(${formatKm(km)})` : ""}
              </span>
            </li>
            <li className="coach-card-list-item" style={{ color: "#E5E5E5", display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: themeColor, flexShrink: 0, marginTop: 5 }} />
              <span>{coach.timing}</span>
            </li>
            <li className="coach-card-list-item" style={{ color: "#E5E5E5", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: themeColor, flexShrink: 0 }} />
              <span>{full ? "Fully Booked" : `${coach.seatsLeft} seat${coach.seatsLeft !== 1 ? "s" : ""} left`}</span>
            </li>
          </ul>

          <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="coach-card-price" style={{ fontSize: 18, fontWeight: 700, color: themeColor }}>
              {coach.price}
            </span>
            <span className="coach-card-explore" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.02em", color: themeColor }}>
              Explore ↗
            </span>
          </div>
        </div>
      </motion.div>
      </Tilt3D>
    </Link>
  );
}

/* â”€â”€ Skeleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function CoachSkeleton() {
  return (
    <div style={{
      background: "#0a0a0a",
      border: "1px solid rgba(255,255,255,0.05)",
      borderRadius: 20, overflow: "hidden",
      height: "100%",
    }}>
      <div className="skeleton" style={{ aspectRatio: "5/4", borderRadius: 0 }} />
      <div style={{ padding: "22px 22px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="skeleton" style={{ height: 14, width: "60%", borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 12, width: "45%", borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 12, width: "50%", borderRadius: 6 }} />
      </div>
    </div>
  );
}

/* â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function LearnContent({ initialCoaches }: { initialCoaches?: Coach[] }) {
  const [filters, setFilters] = useState<CoachFilters>({});

  // Read ?sport= after mount instead of useSearchParams: that hook forces this
  // whole subtree to client-render during static prerender, emptying the SEO HTML.
  useEffect(() => {
    const sport = new URLSearchParams(window.location.search).get("sport");
    if (sport) startTransition(() => setFilters(p => ({ ...p, sport })));
  }, []);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 260);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error } = useCoaches({ ...filters, q: debounced || undefined }, initialCoaches);

  // Unfiltered list â€” used only to build the Sport chips from the sports
  // coaches were actually entered with (so e.g. "Boxing/Kick" shows up).
  const { data: allCoaches } = useCoaches({}, initialCoaches);
  const sportOptions = useMemo(() => {
    const sports = new Set<string>();
    (allCoaches ?? []).forEach(c => { if (c.sport) sports.add(c.sport); });
    const fromData = [...sports].sort((a, b) => a.localeCompare(b));
    return fromData.length ? fromData : [...SPORTS];
  }, [allCoaches]);

  // Near-me is a sort, not a filter: it reorders what the filters already
  // returned, so "Clear" deliberately leaves it alone. Coaches with no pinned
  // location keep their existing order at the bottom of the list.
  const [origin, setOrigin] = useState<Coords | null>(null);
  const coaches = useMemo(() => sortByDistance(data ?? [], origin), [data, origin]);

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

      <main className="noise" style={{ background: "#000000", color: "#fff", position: "relative", overflow: "hidden" }}>
        <Hero count={data?.length ?? null} />

        {/* Search + filters */}
        <section style={{ position: "relative", zIndex: 2, padding: "16px 0 32px" }}>
          <style>{`
            .learn-filter-bar {
              display: flex;
              align-items: center;
              background: rgba(255, 255, 255, 0.03);
              backdrop-filter: blur(24px);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 100px;
              box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.05);
              padding: 10px;
              min-height: 88px;
              position: relative;
              z-index: 20;
            }
            .learn-filter-search {
              display: flex;
              align-items: center;
              flex-grow: 1;
              padding-left: 16px;
              height: 100%;
            }
            .learn-filter-divider {
              width: 1px;
              height: 40%;
              background: rgba(255,255,255,0.1);
            }
            .learn-filter-btn {
              height: 100%;
              padding: 0 32px;
            }
            @media (max-width: 900px) {
              .learn-filter-bar {
                flex-wrap: wrap;
                border-radius: 24px;
                padding: 16px;
                gap: 16px;
              }
              .learn-filter-divider {
                display: none;
              }
              .learn-filter-search {
                width: 100%;
                flex-basis: 100%;
                padding-left: 8px;
                height: 48px;
              }
              .learn-filter-btn {
                width: 100%;
                flex-basis: 100%;
                height: 48px;
                border-radius: 100px !important;
              }
              .toolbar-dropdown-wrapper {
                flex: 1;
                min-width: 30%;
                padding: 8px !important;
                border: 1px solid rgba(255,255,255,0.05);
                border-radius: 16px;
                background: rgba(255,255,255,0.02);
              }
              .toolbar-dropdown-wrapper button {
                width: 100%;
                align-items: center;
                text-align: center;
              }
            }
            .result-meta {
              display: flex;
              align-items: center;
              margin-bottom: 40px;
              gap: 14px;
            }
            .meta-near-me {
              order: 1;
            }
            .meta-count {
              order: 2;
            }
            .meta-link {
              order: 3;
              margin-left: auto;
            }
            .coach-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
              gap: 20px;
              margin-bottom: 120px;
            }
            .coach-card-img {
              height: 240px;
            }
            .coach-card-content {
              padding: 24px;
            }
            .coach-card-title {
              font-size: 32px;
            }
            .coach-card-list {
              gap: 12px;
              margin: 0 0 32px 0;
            }
            .coach-card-list-item {
              font-size: 13px;
              white-space: nowrap;
            }
            @media (max-width: 900px) {
              .result-meta {
                flex-wrap: wrap;
                gap: 16px 0;
              }
              .meta-near-me {
                order: 1;
                width: 100%;
              }
              .meta-count {
                order: 2;
              }
              .meta-link {
                order: 3;
                margin-left: auto;
              }
              .coach-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin-bottom: 80px;
              }
              .coach-card-img {
                height: 140px;
              }
              .coach-card-content {
                padding: 12px;
              }
              .coach-card-title {
                font-size: 20px;
                margin: 0 0 4px 0 !important;
              }
              .coach-card-type {
                font-size: 11px !important;
                margin: 0 0 12px 0 !important;
              }
              .coach-card-list {
                gap: 6px;
                margin: 0 0 16px 0;
              }
              .coach-card-list-item {
                font-size: 11px;
                white-space: normal;
                line-height: 1.2;
              }
              .coach-card-list-item span:last-child {
                white-space: normal !important;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                text-overflow: ellipsis;
                overflow: hidden;
              }
              .coach-card-price {
                font-size: 15px !important;
              }
              .coach-card-explore {
                font-size: 11px !important;
              }
              .coach-badge {
                font-size: 9px !important;
                padding: 4px 8px !important;
              }
            }
          `}</style>
          <div className="container-lg">
            <Reveal style={{ position: "relative", zIndex: 100, marginBottom: 32 }}>
                <div className="learn-filter-bar">
                  
                  {/* Search Input */}
                  <div className="learn-filter-search">
                    <Search size={22} color="rgba(255,255,255,0.4)" style={{ flexShrink: 0 }} />
                    <input
                      placeholder="Search coaches, sports..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{
                        width: "100%", padding: "0 16px", fontSize: 16,
                        background: "transparent", border: "none", color: "#fff",
                        outline: "none", fontFamily: "var(--font-sans)",
                      }}
                    />
                  </div>

                  <div className="learn-filter-divider" />
                  <ToolbarDropdown label="Sport" options={sportOptions} value={filters.sport} onChange={v => set("sport", v)} align="left" />
                  <div className="learn-filter-divider" />
                  <ToolbarDropdown label="Level" options={LEVELS} value={filters.skillLevel} onChange={v => set("skillLevel", v)} align="center" />
                  <div className="learn-filter-divider" />
                  <ToolbarDropdown label="Type" options={TYPES} value={filters.type} onChange={v => set("type", v)} align="right" />


                </div>
            </Reveal>

            {/* Result meta */}
            <div className="result-meta">
              <div className="meta-near-me">
                <NearMeToggle onChange={setOrigin} />
              </div>
              
              <div className="meta-count">
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                  {isLoading
                    ? "Loading coaches…"
                    : error
                      ? "Couldn't load coaches"
                      : `${data?.length ?? 0} ${(data?.length ?? 0) === 1 ? "coach" : "coaches"} found`}
                </span>
              </div>
              
              {!isLoading && !error && (data?.length ?? 0) > 0 && (
                <div className="meta-link">
                  <Magnetic strength={6}>
                    <Link href="/play" style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      fontSize: 12, fontWeight: 600,
                      color: "rgba(255,255,255,0.6)",
                      textDecoration: "none",
                      whiteSpace: "nowrap"
                    }}>
                      Looking to play instead? <ArrowUpRight size={12} />
                    </Link>
                  </Magnetic>
                </div>
              )}
            </div>

            {/* Grid */}
            {isLoading ? (
              <div className="coach-grid">
                {Array(6).fill(0).map((_, i) => <CoachSkeleton key={i} />)}
              </div>
            ) : error ? (
              <div style={{
                padding: "80px 24px",
                textAlign: "center",
                borderRadius: 20,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}>
                <p style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>
                  Failed to load coaches. Please refresh.
                </p>
              </div>
            ) : !data?.length ? (
              <div style={{ textAlign: "center", padding: "100px 0" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 20,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.18)",
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
                className="coach-grid"
              >
                {coaches.map(coach => <CoachCard key={coach.id} coach={coach} origin={origin} />)}
              </Stagger>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

export default function LearnClient({ initialCoaches }: { initialCoaches?: Coach[] }) {
  return (
    <Suspense fallback={<div style={{ background: "#050505", minHeight: "100vh" }} />}>
      <LearnContent initialCoaches={initialCoaches} />
    </Suspense>
  );
}
