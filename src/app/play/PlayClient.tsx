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
  useGames,
  useJoinGame,
  type GameFilters,
  type Game,
} from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { STORY, gameImage } from "@/lib/premium-images";
import { distanceKm, sortByDistance, formatKm, type Coords } from "@/lib/maps";

const SPORTS = [
  "Basketball",
  "Football",
  "Cricket",
  "Badminton",
  "Tennis",
  "Volleyball",
] as const;
const COSTS = [
  { v: "free", l: "Free" },
  { v: "paid", l: "Paid" },
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
                  ? `${count} pickup games live`
                  : "Pickup games · Kozhikode"}
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
                Your{" "}
                <span
                  style={{
                    color: "var(--text3)",
                    fontStyle: "italic",
                    paddingRight: "10px",
                  }}
                >
                  next game
                </span>{" "}
                is
              </motion.div>
            </motion.div>
            <motion.div style={{ overflow: "hidden" }}>
              <motion.div
                initial={{ y: "100%", rotateZ: 4, opacity: 0 }}
                animate={{ y: "0%", rotateZ: 0, opacity: 1 }}
                transition={{
                  duration: 1.2,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 0.18,
                }}
              >
                five minutes away.
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
                Drop in on games posted by your neighbours or host your own when
                the court is free. No WhatsApp scramble — just a map and a clock.
              </p>
            </Reveal>

            <Reveal delay={0.5}>
              <Magnetic strength={10}>
                <Link
                  href="/create-game"
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
                  Host a game
                  <ArrowUpRight size={16} />
                </Link>
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
  // Fallback title case for other sports if needed, though they are fine
  return text
    .split("/")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("/");
}

type ToolbarDropdownProps = {
  label: string;
  options: readonly { v: string; l: string }[];
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

  const activeOption = options.find((o) => o.v === value);

  return (
    <div
      ref={ref}
      className="toolbar-dropdown-wrapper"
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
          {activeOption
            ? label === "Sport"
              ? formatSportName(activeOption.l)
              : activeOption.l
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
              const active = value === opt.v;
              return (
                <button
                  key={opt.v}
                  onClick={() => {
                    onChange(opt.v);
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
                  {label === "Sport" ? formatSportName(opt.l) : opt.l}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Game card ──────────────────────────────────────────── */

function GameCard({ game, origin }: { game: Game; origin: Coords | null }) {
  const { user } = useAuth();
  const join = useJoinGame();
  const km = origin ? distanceKm(origin, game) : null;
  const filled = game.slots - game.slotsLeft;
  const pct = Math.min(100, Math.round((filled / game.slots) * 100));
  const isFull = game.slotsLeft === 0 || game.status === "full";
  const joinable = !["cancelled", "completed", "archived"].includes(
    game.status,
  );
  const isFree = game.costAmount === 0;
  const img = game.imageUrl || gameImage(game.sport, game.id).src;

  const themeColor = "#fff";

  // Where the viewer already stands with this game. Hosting is derived from
  // data the card already had; joined/waitlisted come from the listing endpoint.
  const standing =
    user && game.organizerId === user.id
      ? "Hosting"
      : game.joined
        ? "Joined"
        : game.waitlisted
          ? "Waitlisted"
          : null;

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
        className="game-card group"
      >
        <Image
          src={img}
          alt={game.title}
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
        <Link href={`/game/${game.id}`} style={{ position: "absolute", inset: 0, zIndex: 10 }} />

        {/* Top Badges */}
        <div
          className="game-card-top"
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
          <div className="game-card-badges" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <SportBadge sport={game.sport} />
            <SkillBadge level={game.skillLevel} />
          </div>
          <span
            className="game-card-badge"
            style={{
              fontWeight: 700,
              background: isFree ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.15)",
              color: isFree ? "#000" : "#fff",
              backdropFilter: "blur(12px)",
              border: isFree ? "none" : "1px solid rgba(255,255,255,0.3)",
              borderRadius: 100
            }}
          >
            {isFree ? "Free" : `₹${game.costAmount}`}
          </span>
        </div>

        {/* Bottom Content */}
        <div
          className="game-card-content"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            pointerEvents: "none",
          }}
        >
          <h3
            className="game-card-title"
            style={{
              fontFamily: "var(--font-serif)",
              lineHeight: 1.05,
              fontWeight: 400,
              color: "#fff",
              textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            }}
          >
            {game.title}
          </h3>

          <div className="game-card-info" style={{ display: "flex", flexDirection: "column", color: "rgba(255,255,255,0.7)" }}>
            <div className="game-card-info-item" style={{ display: "flex", alignItems: "center" }}>
              <MapPin size={14} style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {game.location}
              </span>
              {km != null && (
                <span style={{ marginLeft: "auto", color: "#fff", fontWeight: 700 }}>
                  {formatKm(km)}
                </span>
              )}
            </div>
            <div className="game-card-info-item" style={{ display: "flex", alignItems: "center" }}>
              <Clock size={14} style={{ flexShrink: 0 }} />
              <span>
                {fmtDate(game.scheduledAt)} · {game.duration}min
              </span>
            </div>
            {!isFree && (
              <div className="game-card-info-item" style={{ display: "flex", alignItems: "center" }}>
                <IndianRupee size={14} style={{ flexShrink: 0 }} />
                <span>Pay host directly</span>
              </div>
            )}
          </div>

          {/* Slot bar */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,0.6)",
                marginBottom: 6,
              }}
              className="game-card-slots"
            >
              <span>{filled} / {game.slots} Spots</span>
              <span style={{ color: isFull ? "#fff" : game.slotsLeft <= 2 ? "#fbbf24" : "#fff" }}>
                {isFull ? "Full" : `${game.slotsLeft} left`}
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
            className="game-card-footer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(255,255,255,0.15)",
              pointerEvents: "auto",
              position: "relative",
              zIndex: 30, // Above the link so buttons are clickable
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
              <Star size={12} fill="#eab308" color="#eab308" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                {game.organizerRating?.toFixed(1) ?? "—"}
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
                {game.organizerName}
              </span>
            </div>

            {!joinable ? (
              <span
                style={{
                  padding: "6px 14px",
                  borderRadius: 100,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  flexShrink: 0,
                }}
              >
                {game.status === "completed" ? "Completed" : "Closed"}
              </span>
            ) : standing ? (
              <Link
                href={`/game/${game.id}`}
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
            ) : user ? (
              <button
                disabled={join.isPending}
                onClick={() => join.mutate(game.id)}
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
                  cursor: join.isPending ? "not-allowed" : "pointer",
                  opacity: join.isPending ? 0.6 : 1,
                  flexShrink: 0,
                  transition: "transform 200ms",
                }}
              >
                {join.isPending ? "…" : isFull ? "Waitlist" : "Join"}
              </button>
            ) : (
              <Link
                href="/login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
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
        style={{ aspectRatio: "5/4", borderRadius: 0 }}
      />
      <div
        style={{
          padding: "18px 22px 22px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          className="skeleton"
          style={{ height: 14, width: "60%", borderRadius: 6 }}
        />
        <div
          className="skeleton"
          style={{ height: 12, width: "45%", borderRadius: 6 }}
        />
        <div
          className="skeleton"
          style={{ height: 4, width: "100%", borderRadius: 100 }}
        />
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────── */

function PlayContent({ initialGames }: { initialGames?: Game[] }) {
  const [filters, setFilters] = useState<GameFilters>({});

  // Read ?sport= after mount instead of useSearchParams: that hook forces this
  // whole subtree to client-render during static prerender, emptying the SEO HTML.
  useEffect(() => {
    const sport = new URLSearchParams(window.location.search).get("sport");
    if (sport) startTransition(() => setFilters((p) => ({ ...p, sport })));
  }, []);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 260);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error } = useGames(
    { ...filters, q: debounced || undefined },
    initialGames,
  );

  // Near-me is a sort, not a filter: it reorders what the filters already
  // returned, so "Clear" deliberately leaves it alone. Games without venue
  // coordinates keep their soonest-first order at the bottom of the list.
  const [origin, setOrigin] = useState<Coords | null>(null);
  const games = useMemo(
    () => sortByDistance(data ?? [], origin),
    [data, origin],
  );

  const set = (k: keyof GameFilters, v: string) =>
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
          style={{ position: "relative", zIndex: 2, padding: "16px 0 32px" }}
        >
          <style>{`
            .play-filter-bar {
              display: flex;
              align-items: center;
              background: rgba(13,13,13,0.7);
              backdrop-filter: blur(18px);
              border: 1px solid rgba(255, 255, 255, 0.06);
              border-radius: 100px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.4);
              padding: 10px;
              min-height: 88px;
              position: relative;
              z-index: 20;
            }
            .play-filter-search {
              display: flex;
              align-items: center;
              flex-grow: 1;
              padding-left: 16px;
              height: 100%;
            }
            .play-filter-divider {
              width: 1px;
              height: 40%;
              background: rgba(255,255,255,0.1);
            }
            .play-filter-btn {
              height: 100%;
              padding: 0 32px;
            }
            .result-meta {
              display: flex;
              align-items: center;
              margin-bottom: 28px;
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
            .game-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
              gap: 20px;
            }
            .game-card-content {
              padding: 24px;
              gap: 16px;
            }
            .game-card-title {
              font-size: clamp(24px, 5vw, 32px);
              margin-bottom: 0;
            }
            .game-card-info {
              gap: 8px;
              font-size: 13px;
            }
            .game-card-info-item {
              gap: 8px;
            }
            .game-card-footer {
              padding-top: 16px;
            }
            .game-card-badge {
              font-size: 11px;
              padding: 4px 12px;
            }
            @media (max-width: 900px) {
              .game-card {
                aspect-ratio: auto !important;
                min-height: 340px !important;
              }
              .game-card-top {
                top: 12px !important;
                left: 12px !important;
                right: 12px !important;
              }
              .game-card-badges {
                flex-direction: column;
                align-items: flex-start;
                gap: 4px !important;
              }
              .play-filter-bar {
                flex-wrap: wrap;
                border-radius: 24px;
                padding: 16px;
                gap: 16px;
              }
              .play-filter-divider {
                display: none;
              }
              .play-filter-search {
                width: 100%;
                flex-basis: 100%;
                padding-left: 8px;
                height: 48px;
              }
              .play-filter-btn {
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
              .game-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
              }
              .game-card-content {
                padding: 12px;
                gap: 10px;
              }
              .game-card-title {
                font-size: 18px !important;
                margin-bottom: 4px !important;
              }
              .game-card-info {
                gap: 4px;
                font-size: 10px;
              }
              .game-card-info-item {
                gap: 4px;
              }
              .game-card-info-item svg {
                width: 10px;
                height: 10px;
              }
              .game-card-footer {
                padding-top: 10px;
              }
              .game-card-badge {
                font-size: 9px !important;
                padding: 4px 8px !important;
              }
            }
          `}</style>
          <div className="container-lg">
            <Reveal
              style={{ position: "relative", zIndex: 100, marginBottom: 32 }}
            >
              <div className="play-filter-bar">
                <div className="play-filter-search">
                  <Search
                    size={22}
                    color="rgba(255,255,255,0.4)"
                    style={{ flexShrink: 0 }}
                  />
                  <input
                    placeholder="Search games, sports, venues…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0 16px",
                      background: "transparent",
                      border: "none",
                      color: "#fff",
                      outline: "none",
                      fontSize: 16,
                      fontFamily: "var(--font-sans)",
                    }}
                  />
                </div>

                <div className="play-filter-divider" />

                <ToolbarDropdown
                  label="Sport"
                  options={SPORTS.map((s) => ({ v: s, l: s }))}
                  value={filters.sport}
                  onChange={(v) => set("sport", v)}
                  align="left"
                />

                <div className="play-filter-divider" />

                <ToolbarDropdown
                  label="Cost"
                  options={COSTS}
                  value={filters.cost}
                  onChange={(v) => set("cost", v)}
                  align="right"
                />


              </div>
            </Reveal>

            {/* Meta */}
            <div className="result-meta">
              <div className="meta-near-me">
                <NearMeToggle onChange={setOrigin} />
              </div>
              <div className="meta-count">
                <span
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.45)",
                    letterSpacing: "0.02em",
                    whiteSpace: "nowrap"
                  }}
                >
                  {isLoading
                    ? "Loading games…"
                    : error
                      ? "Couldn't load games"
                      : `${data?.length ?? 0} ${(data?.length ?? 0) === 1 ? "game" : "games"} available`}
                </span>
              </div>
              {!isLoading && !error && (data?.length ?? 0) > 0 && (
                <div className="meta-link">
                  <Magnetic strength={6}>
                    <Link
                      href="/learn"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.6)",
                        textDecoration: "none",
                        whiteSpace: "nowrap"
                      }}
                    >
                      Looking to train instead? <ArrowUpRight size={12} />
                    </Link>
                  </Magnetic>
                </div>
              )}
            </div>

            {/* Grid */}
            {isLoading ? (
              <div className="game-grid">
                {Array(6)
                  .fill(0)
                  .map((_, i) => (
                    <GameSkeleton key={i} />
                  ))}
              </div>
            ) : error ? (
              <div
                style={{
                  padding: "80px 24px",
                  textAlign: "center",
                  borderRadius: 20,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <p style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>
                  Failed to load games. Please refresh.
                </p>
              </div>
            ) : !data?.length ? (
              <div style={{ textAlign: "center", padding: "100px 0" }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 20,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                  }}
                >
                  <Users size={24} color="rgba(255,255,255,0.6)" />
                </div>
                <h3
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#fff",
                    marginBottom: 8,
                    letterSpacing: "-0.02em",
                  }}
                >
                  No games yet today.
                </h3>
                <p
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 14,
                    marginBottom: 32,
                  }}
                >
                  Be the first to host — takes less than a minute.
                </p>
                <Magnetic strength={10}>
                  <Link
                    href="/create-game"
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
                    Host a game
                    <ArrowUpRight size={16} />
                  </Link>
                </Magnetic>
              </div>
            ) : (
              <Stagger
                stagger={0.05}
                y={24}
                className="game-grid"
                style={{
                  marginBottom: 120,
                }}
              >
                {games.map((game) => (
                  <GameCard key={game.id} game={game} origin={origin} />
                ))}
              </Stagger>
            )}
          </div>
        </section>
      </main>

      <style>{`
        .game-card:hover { border-color: rgba(255,255,255,0.3); box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.12); transform: translateY(-4px); }
        .game-card:hover .game-card-img-wrap img { transform: scale(1.05); filter: saturate(1); }
        .game-card-img-wrap img { transition: transform 700ms cubic-bezier(0.16,1,0.3,1), filter 500ms; }
      `}</style>
    </>
  );
}

export default function PlayClient({
  initialGames,
}: {
  initialGames?: Game[];
}) {
  return (
    <Suspense
      fallback={<div style={{ background: "#050505", minHeight: "100vh" }} />}
    >
      <PlayContent initialGames={initialGames} />
    </Suspense>
  );
}
