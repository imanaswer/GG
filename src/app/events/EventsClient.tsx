"use client";
import Link from "next/link";
import Image from "next/image";
import {
  useState,
  useMemo,
  useEffect,
  useRef,
  Suspense,
  startTransition,
} from "react";
import {
  Search,
  Plus,
  MapPin,
  Clock,
  Users,
  Star,
  SlidersHorizontal,
  ArrowUpRight,
  X,
  IndianRupee,
  Check,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { PremiumNav } from "@/components/premium/PremiumNav";
import { SmoothScroll } from "@/components/premium/SmoothScroll";
import { Reveal, Stagger } from "@/components/premium/Reveal";
import { Magnetic } from "@/components/premium/Magnetic";
import { Tilt3D } from "@/components/premium/Tilt3D";
import { SkillBadge, SportBadge, fmtDate } from "@/components/Shared";
import { NearMeToggle } from "@/components/NearMeToggle";
import {
  useEvents,
  type EventFilters,
  type SportEvent,
} from "@/hooks/useData";
import { EVENT_IMAGE } from "@/lib/premium-images";
import { distanceKm, sortByDistance, formatKm, type Coords } from "@/lib/maps";

const SPORTS = [
  "Basketball",
  "Football",
  "Tennis",
  "Cricket",
  "Running",
  "Badminton",
  "Multi-Sport",
] as const;

const TYPES = [
  { v: "Tournament", l: "Tournament" },
  { v: "League", l: "League" },
  { v: "Marathon", l: "Marathon" },
  { v: "Festival", l: "Festival" },
  { v: "Workshop", l: "Workshop" },
  { v: "Seminar", l: "Seminar" },
] as const;

const DIFFICULTIES = [
  { v: "Beginner", l: "Beginner" },
  { v: "Intermediate", l: "Intermediate" },
  { v: "Advanced", l: "Advanced" },
  { v: "All Levels", l: "All levels" },
] as const;

const WHENS = [
  { v: "this-week", l: "This week" },
  { v: "this-month", l: "This month" },
  { v: "upcoming", l: "Upcoming" },
] as const;

/* ── Hero band ──────────────────────────────────────────── */

function Hero({ count }: { count: number | null }) {
  return (
    <section
      style={{
        position: "relative",
        padding: "160px 0 24px",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        className="container-lg"
        style={{ position: "relative", zIndex: 10 }}
      >
        <Reveal>
          <Magnetic strength={20}>
            <motion.div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 20px",
                borderRadius: 100,
                background: "rgba(25, 25, 25, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                marginBottom: 40,
                cursor: "pointer",
                backdropFilter: "blur(10px)",
                position: "relative",
                overflow: "hidden",
              }}
              whileHover={{
                scale: 1.02,
                borderColor: "rgba(255, 255, 255, 0.3)",
                background: "rgba(30, 30, 30, 0.5)",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <motion.div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "-100%",
                  bottom: 0,
                  width: "100%",
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
                  zIndex: 0,
                }}
                animate={{ x: ["0%", "200%"] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
              />

              <span
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 6,
                  height: 6,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    background: "#FFFFFF",
                    opacity: 0.8,
                    animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
                  }}
                />
                <span
                  style={{
                    position: "relative",
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "#FFFFFF",
                    boxShadow: "0 0 8px 2px rgba(255, 255, 255, 0.8)",
                  }}
                />
              </span>

              <span
                style={{
                  position: "relative",
                  zIndex: 1,
                  fontFamily: "var(--font-sans), sans-serif",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.9)",
                  transform: "translateY(1px)",
                }}
              >
                {count !== null
                  ? `${count} events live`
                  : "Events · Kozhikode"}
              </span>
            </motion.div>
          </Magnetic>
        </Reveal>

        <div style={{ padding: "20px 0 20px 0" }}>
          <h1
            className="display"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(32px, 7.5vw, 130px)",
              lineHeight: 0.9,
              letterSpacing: "-0.01em",
              color: "#fff",
              width: "100%",
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <motion.div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
              <motion.div
                initial={{ y: "100%", rotateZ: 4, opacity: 0 }}
                animate={{ y: "0%", rotateZ: 0, opacity: 1 }}
                transition={{
                  duration: 1.2,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 0.1,
                }}
              >
                Step onto the
              </motion.div>
            </motion.div>
            <motion.div style={{ overflow: "hidden", paddingBottom: "0.2em", marginBottom: "-0.2em" }}>
              <motion.div
                initial={{ y: "100%", rotateZ: 4, opacity: 0 }}
                animate={{ y: "0%", rotateZ: 0, opacity: 1 }}
                transition={{
                  duration: 1.2,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 0.18,
                }}
              >
                <span
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontStyle: "italic",
                    paddingRight: "10px",
                  }}
                >
                  big stage.
                </span>
              </motion.div>
            </motion.div>
          </h1>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 24,
              marginTop: 20,
              flexWrap: "wrap",
            }}
          >
            <Reveal delay={0.4}>
              <p
                style={{
                  fontSize: "clamp(16px, 1.5vw, 20px)",
                  color: "rgba(255,255,255,0.6)",
                  maxWidth: 580,
                  margin: 0,
                  lineHeight: 1.6,
                  fontWeight: 400,
                }}
              >
                Tournaments, leagues, marathons, and festivals across the city.
                Register with your squad — or show up solo and meet your next teammates under the lights.
              </p>
            </Reveal>

            <Reveal delay={0.5}>
              <Magnetic strength={10}>
                <button
                  onClick={() => {
                    document.getElementById("events-grid")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "16px 28px",
                    borderRadius: 100,
                    background: "#fff",
                    color: "#000",
                    textDecoration: "none",
                    fontWeight: 700,
                    fontSize: 13,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    boxShadow: "0 10px 30px rgba(255,255,255,0.1)",
                    transition: "transform 0.3s, box-shadow 0.3s",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow =
                      "0 15px 40px rgba(255,255,255,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 10px 30px rgba(255,255,255,0.1)";
                  }}
                >
                  Browse events
                  <ChevronRight size={16} />
                </button>
              </Magnetic>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Filter pills ────────────────────────────────────────── */

export function formatSportName(text: string) {
  if (!text) return "";
  if (text === "BOXING/KICK") return "Boxing/Kick";
  return text
    .split("/")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("/");
}

type ToolbarDropdownProps = {
  label: string;
  options: readonly { v: string; l: string }[] | readonly string[];
  value?: string;
  onChange: (v: string) => void;
  align?: "left" | "center" | "right";
};

function ToolbarDropdown({
  label,
  options,
  value,
  onChange,
  align = "left",
}: ToolbarDropdownProps) {
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

  const activeOption = options.find((o) => (typeof o === "string" ? o : o.v) === value);
  const activeLabel = activeOption ? (typeof activeOption === "string" ? activeOption : activeOption.l) : null;

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        height: "100%",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 0,
          textAlign: "left",
          gap: 2,
          outline: "none",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: value ? "#fff" : "rgba(255,255,255,0.5)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap",
          }}
        >
          {activeLabel
            ? label === "Sport"
              ? formatSportName(activeLabel)
              : activeLabel
            : `Any ${label}`}
          <ChevronDown
            size={14}
            style={{
              color: "rgba(255,255,255,0.4)",
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}
          />
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
              background: "#111111",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: 8,
              minWidth: 200,
              zIndex: 50,
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <button
              onClick={() => {
                onChange("all");
                setOpen(false);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 16px",
                background: !value ? "rgba(255,255,255,0.05)" : "transparent",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                outline: "none",
                color: !value ? "#fff" : "rgba(255,255,255,0.6)",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Any {label}
            </button>
            {options.map((opt) => {
              const optVal = typeof opt === "string" ? opt : opt.v;
              const optLabel = typeof opt === "string" ? opt : opt.l;
              const active = value === optVal;
              return (
                <button
                  key={optVal}
                  onClick={() => {
                    onChange(optVal);
                    setOpen(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 16px",
                    background: active
                      ? "rgba(255,255,255,0.05)"
                      : "transparent",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    outline: "none",
                    color: active ? "#fff" : "rgba(255,255,255,0.6)",
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  {label === "Sport" ? formatSportName(optLabel) : optLabel}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Event card ──────────────────────────────────────────── */

function EventCard({ event, origin }: { event: SportEvent; origin: Coords | null }) {
  const km = origin ? distanceKm(origin, event) : null;
  const isFull = event.maxParticipants - event.participants <= 0;
  const pct = Math.min(100, Math.round((event.participants / event.maxParticipants) * 100));
  const slotsLeft = Math.max(0, event.maxParticipants - event.participants);
  const isFree = event.entryFeeAmount === 0;
  const img = event.imageUrl || EVENT_IMAGE.src;

  const standing = null; // Update logic if needed

  return (
    <Tilt3D
      intensity={8}
      data-stagger
      style={{ height: "100%", borderRadius: 20 }}
    >
      <div
        data-stagger
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          aspectRatio: "3/4",
          background: "#000",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          overflow: "hidden",
          transition: "border-color 300ms, box-shadow 300ms, transform 300ms",
        }}
        className="event-card group"
      >
        <Image
          src={img}
          alt={event.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw"
          style={{ objectFit: "cover", transition: "transform 0.6s cubic-bezier(0.16,1,0.3,1)" }}
          className="group-hover:scale-105"
        />

        {/* Gradient Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 45%, transparent 100%)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {/* Full card clickable link */}
        <Link href={`/events/${event.id}`} style={{ position: "absolute", inset: 0, zIndex: 10 }} />

        {/* Top Badges */}
        <div
          className="event-card-top"
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            right: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          <div className="event-card-badges" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <SportBadge sport={event.sport} />
            <SkillBadge level={event.difficulty} />
          </div>
          <span
            className="event-card-badge"
            style={{
              fontWeight: 700,
              background: isFree ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.15)",
              color: isFree ? "#000" : "#fff",
              backdropFilter: "blur(12px)",
              border: isFree ? "none" : "1px solid rgba(255,255,255,0.3)",
              borderRadius: 100
            }}
          >
            {isFree ? "Free" : `₹${event.entryFeeAmount}`}
          </span>
        </div>

        {/* Bottom Content */}
        <div
          className="event-card-content"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: 24,
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            pointerEvents: "none",
          }}
        >
          <h3
            className="event-card-title"
            style={{
              fontFamily: "var(--font-serif)",
              lineHeight: 1.05,
              fontWeight: 400,
              color: "#fff",
              textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            }}
          >
            {event.title}
          </h3>

          <div className="event-card-info" style={{ display: "flex", flexDirection: "column", color: "rgba(255,255,255,0.7)" }}>
            <div className="event-card-info-item" style={{ display: "flex", alignItems: "center" }}>
              <MapPin size={14} style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {event.location}
              </span>
              {km != null && (
                <span style={{ marginLeft: "auto", color: "#fff", fontWeight: 700 }}>
                  {formatKm(km)}
                </span>
              )}
            </div>
            <div className="event-card-info-item" style={{ display: "flex", alignItems: "center" }}>
              <Clock size={14} style={{ flexShrink: 0 }} />
              <span>
                {fmtDate(event.startDate)} - {fmtDate(event.endDate)}
              </span>
            </div>
          </div>

          {/* Slot bar */}
          <div>
            <div
              className="event-card-slots"
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,0.6)",
                marginBottom: 6,
              }}
            >
              <span>{event.participants} / {event.maxParticipants} Spots</span>
              <span style={{ color: isFull ? "#fff" : slotsLeft <= 2 ? "#fbbf24" : "#fff" }}>
                {isFull ? "Full" : `${slotsLeft} left`}
              </span>
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 100, overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  height: "100%",
                  background: pct >= 100 ? "#fff" : pct >= 75 ? "#fff" : "#fff",
                  borderRadius: 100,
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div
            className="event-card-footer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 16,
              borderTop: "1px solid rgba(255,255,255,0.15)",
              pointerEvents: "auto",
              position: "relative",
              zIndex: 30,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
              <Star size={12} fill="#eab308" color="#eab308" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                5.0
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.5)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {event.organizer}
              </span>
            </div>

            {standing ? (
              <Link
                href={`/events/${event.id}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 14px",
                  borderRadius: 100,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  background: "rgba(255,255,255,0.1)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.2)",
                  textDecoration: "none",
                  flexShrink: 0,
                  backdropFilter: "blur(10px)",
                }}
              >
                <Check size={12} /> {standing}
              </Link>
            ) : (
              <Link
                href={`/events/${event.id}`}
                style={{
                  padding: "6px 14px",
                  borderRadius: 100,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  background: isFull ? "transparent" : "#fff",
                  color: isFull ? "rgba(255,255,255,0.5)" : "#000",
                  border: isFull ? "1px solid rgba(255,255,255,0.1)" : "none",
                  textDecoration: "none",
                  flexShrink: 0,
                }}
              >
                {isFull ? "Waitlist" : "View"}
              </Link>
            )}
          </div>
        </div>
      </div>
    </Tilt3D>
  );
}

/* ── Skeleton ──────────────────────────────────────────── */

function EventSkeleton() {
  return (
    <div
      style={{
        background: "#0a0a0a",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 20,
        overflow: "hidden",
        height: "100%",
      }}
    >
      <div
        className="skeleton"
        style={{ aspectRatio: "3/4", borderRadius: 0 }}
      />
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────── */

export default function EventsClient({
  initialEvents,
}: {
  initialEvents?: SportEvent[];
}) {
  const [filters, setFilters] = useState<EventFilters>({});
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error } = useEvents(
    { ...filters, q: debounced || undefined },
    initialEvents,
  );

  const [origin, setOrigin] = useState<Coords | null>(null);
  const events = useMemo(
    () => sortByDistance(data ?? [], origin),
    [data, origin],
  );

  const set = (k: keyof EventFilters, v: string) =>
    setFilters((p) => ({ ...p, [k]: v === "all" || !v ? undefined : v }));

  const hasFilters = useMemo(
    () => !!search || Object.values(filters).some(Boolean),
    [search, filters],
  );

  return (
    <>
      <SmoothScroll />
      <PremiumNav variant="solid" />

      <main
        className="noise"
        style={{
          background: "#000000",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
          minHeight: "100vh",
        }}
      >
        <Hero count={data?.length ?? null} />

        <section
          id="events-grid"
          style={{ position: "relative", zIndex: 2, padding: "16px 0 32px" }}
        >
          <div className="container-lg">
            <Reveal
              style={{ position: "relative", zIndex: 100, marginBottom: 32 }}
            >
              <div
                className="events-filter-bar"
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  padding: "16px",
                  borderRadius: "100px",
                  background: "rgba(13,13,13,0.7)",
                  backdropFilter: "blur(18px)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
                }}
              >
                <div
                  className="events-filter-search"
                  style={{
                    flex: "1 1 200px",
                    minWidth: 200,
                    display: "flex",
                    alignItems: "center",
                    position: "relative",
                    paddingLeft: 16,
                  }}
                >
                  <Search
                    size={16}
                    color="rgba(255,255,255,0.4)"
                    style={{ position: "absolute", left: 16 }}
                  />
                  <input
                    placeholder="Search events, sports, venues…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 10px 10px 42px",
                      background: "transparent",
                      border: "none",
                      color: "#fff",
                      outline: "none",
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  />
                </div>

                <ToolbarDropdown
                  label="Sport"
                  options={SPORTS.map((s) => ({ v: s, l: s }))}
                  value={filters.sport}
                  onChange={(v) => set("sport", v)}
                  align="left"
                />

                <div className="events-filter-divider" />

                <ToolbarDropdown
                  label="Type"
                  options={TYPES}
                  value={filters.type}
                  onChange={(v) => set("type", v)}
                  align="center"
                />

                <div className="events-filter-divider" />

                <ToolbarDropdown
                  label="Level"
                  options={DIFFICULTIES}
                  value={filters.difficulty}
                  onChange={(v) => set("difficulty", v)}
                  align="center"
                />

                <div className="events-filter-divider" />

                <ToolbarDropdown
                  label="When"
                  options={WHENS}
                  value={filters.when}
                  onChange={(v) => set("when", v)}
                  align="right"
                />


              </div>
            </Reveal>

            {/* Meta */}
            <div
              className="result-meta"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 28,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.45)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {isLoading
                    ? "Loading events…"
                    : error
                      ? "Couldn't load events"
                      : `${data?.length ?? 0} ${(data?.length ?? 0) === 1 ? "event" : "events"} available`}
                </span>
                <NearMeToggle onChange={setOrigin} />
              </div>
            </div>

            {/* Grid */}
            <Reveal delay={0.2} style={{ position: "relative", zIndex: 1 }}>
              {isLoading ? (
                <div className="event-grid">
                  {[...Array(6)].map((_, i) => (
                    <EventSkeleton key={i} />
                  ))}
                </div>
              ) : error ? (
                <div
                  style={{
                    padding: "80px 20px",
                    textAlign: "center",
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  Error loading events
                </div>
              ) : events.length === 0 ? (
                <div
                  style={{
                    padding: "80px 20px",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Search size={24} color="rgba(255,255,255,0.2)" />
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        margin: "0 0 8px 0",
                      }}
                    >
                      No events found
                    </h3>
                    <p
                      style={{
                        color: "rgba(255,255,255,0.5)",
                        margin: 0,
                        fontSize: 14,
                      }}
                    >
                      Try adjusting your filters or search terms.
                    </p>
                  </div>
                </div>
              ) : (
                <Stagger>
                  <div className="event-grid">
                    {events.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        origin={origin}
                      />
                    ))}
                  </div>
                </Stagger>
              )}
            </Reveal>
          </div>
        </section>
      </main>

      <style>{`
        .skeleton {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.03) 25%,
            rgba(255,255,255,0.08) 50%,
            rgba(255,255,255,0.03) 75%
          );
          background-size: 400% 100%;
          animation: skeleton-load 1.5s ease-in-out infinite;
        }
        @keyframes skeleton-load {
          0% { background-position: 100% 50%; }
          100% { background-position: 0 50%; }
        }
        @media (max-width: 768px) {
          .display {
            font-size: clamp(40px, 12vw, 80px) !important;
          }
        }
        .event-card:hover {
          border-color: rgba(255,255,255,0.2) !important;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4) !important;
        }
        .event-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
        }
        .event-card-badge {
          font-size: 11px;
          padding: 4px 12px;
        }
        .event-card-content {
          padding: 24px;
          gap: 16px;
        }
        .event-card-title {
          font-size: clamp(24px, 5vw, 32px);
          margin-bottom: 0;
        }
        .event-card-info {
          gap: 8px;
          font-size: 13px;
        }
        .event-card-info-item {
          gap: 8px;
        }
        .event-card-footer {
          padding-top: 16px;
        }
        .events-filter-divider {
          width: 1px;
          background: rgba(255,255,255,0.1);
          margin: 0 8px;
        }
        @media (max-width: 900px) {
          .events-filter-bar {
            flex-wrap: wrap;
            border-radius: 24px !important;
            padding: 16px !important;
            gap: 16px;
          }
          .events-filter-divider {
            display: none;
          }
          .events-filter-search {
            width: 100%;
            flex-basis: 100%;
            padding-left: 8px !important;
            height: 48px;
          }
          .events-filter-btn {
            width: 100% !important;
            flex-basis: 100%;
            height: 48px !important;
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
            align-items: center !important;
            text-align: center !important;
          }
          .result-meta {
            flex-wrap: wrap;
            gap: 16px 0 !important;
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
          .event-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
          .event-card {
            aspect-ratio: auto !important;
            min-height: 340px !important;
          }
          .event-card-top {
            top: 12px !important;
            left: 12px !important;
            right: 12px !important;
          }
          .event-card-badges {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px !important;
          }
          .event-card-content {
            padding: 12px !important;
            gap: 10px !important;
          }
          .event-card-title {
            font-size: 18px !important;
            margin-bottom: 4px !important;
          }
          .event-card-info {
            gap: 4px !important;
            font-size: 10px !important;
          }
          .event-card-info-item {
            gap: 4px !important;
          }
          .event-card-info-item svg {
            width: 10px !important;
            height: 10px !important;
          }
          .event-card-footer {
            padding-top: 10px !important;
          }
          .event-card-badge {
            font-size: 9px !important;
            padding: 4px 8px !important;
          }
        }
      `}</style>
    </>
  );
}
