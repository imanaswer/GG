"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, Plus, MapPin, Clock, Users, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { AIBanner, Img, SkillBadge, SportBadge, SlotBar, fmtDate, SectionHeader } from "@/components/Shared";
import { Input, Skeleton } from "@/components/ui";
import { useGames, useJoinGame, type GameFilters, type Game } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";

const SPORTS = ["Basketball", "Football", "Cricket", "Badminton", "Tennis", "Volleyball"];
const ease   = [0.16, 1, 0.3, 1] as const;

const cardVariants = {
  hidden:  { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.55, delay: i * 0.07, ease },
  }),
};

function GameCard({ game, index }: { game: Game; index: number }) {
  const { user } = useAuth();
  const join   = useJoinGame();
  const filled = game.slots - game.slotsLeft;
  const isFull = game.slotsLeft === 0 || game.status === "full";

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      style={{ height: "100%" }}
    >
      <motion.div
        whileHover={{
          y: -5,
          borderColor: "rgba(34,197,94,0.25)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(34,197,94,0.08)",
        }}
        transition={{ duration: 0.25, ease }}
        style={{
          background: "#0d0d0d",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 18, overflow: "hidden",
          display: "flex", flexDirection: "column", height: "100%",
        }}
      >
        {/* Image */}
        <Link href={`/game/${game.id}`} style={{ display: "block", position: "relative", height: 195, overflow: "hidden", flexShrink: 0 }}>
          <Img
            src={game.imageUrl} alt={game.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)" }} />

          {/* Top badges */}
          <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6 }}>
            <SportBadge sport={game.sport} />
            <SkillBadge level={game.skillLevel} />
          </div>

          {/* Cost badge */}
          <div style={{ position: "absolute", top: 12, right: 12 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 100,
              background: game.costAmount === 0
                ? "rgba(34,197,94,0.85)"
                : "rgba(0,0,0,0.75)",
              color: "#fff",
              border: game.costAmount === 0 ? "none" : "1px solid rgba(255,255,255,0.15)",
              backdropFilter: "blur(4px)",
            }}>
              {game.cost}
            </span>
          </div>

          {/* Almost full warning */}
          {game.slotsLeft <= 2 && game.slotsLeft > 0 && (
            <motion.div
              animate={{ opacity: [1, 0.7, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ position: "absolute", bottom: 12, left: 12 }}
            >
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100,
                background: "rgba(234,179,8,0.9)", color: "#000",
              }}>
                Almost full!
              </span>
            </motion.div>
          )}
        </Link>

        {/* Content */}
        <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", flex: 1 }}>
          <Link href={`/game/${game.id}`} style={{ textDecoration: "none" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 10, lineHeight: 1.35, letterSpacing: "-0.02em" }}>
              {game.title}
            </h3>
          </Link>

          <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <MapPin size={12} color="#52525b" style={{ flexShrink: 0 }} />
              <span style={{ color: "#71717a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.location}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <Clock size={12} color="#52525b" style={{ flexShrink: 0 }} />
              <span style={{ color: "#71717a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {fmtDate(game.scheduledAt)} · {game.duration}min
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <Users size={12} color={isFull ? "#ef4444" : game.slotsLeft <= 2 ? "#eab308" : "#52525b"} style={{ flexShrink: 0 }} />
              <span style={{ color: isFull ? "#ef4444" : game.slotsLeft <= 2 ? "#eab308" : "#71717a" }}>
                {isFull ? "Full" : `${game.slotsLeft}/${game.slots} spots left`}
              </span>
            </div>
          </div>

          {/* Slot bar */}
          <div style={{ marginBottom: 12 }}>
            <SlotBar filled={filled} total={game.slots} />
          </div>

          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1, paddingRight: 10 }}>
              <Star size={11} fill="#eab308" color="#eab308" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{game.organizerRating?.toFixed(1)}</span>
              <span style={{ fontSize: 12, color: "#52525b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {game.organizerName}
              </span>
            </div>

            {user ? (
              <motion.button
                whileHover={{ scale: isFull ? 1 : 1.04 }}
                whileTap={{ scale: 0.97 }}
                disabled={join.isPending}
                onClick={e => { e.stopPropagation(); join.mutate(game.id); }}
                style={{
                  padding: "7px 16px", borderRadius: 9, fontSize: 12, fontWeight: 700,
                  cursor: join.isPending ? "not-allowed" : "pointer",
                  border: isFull ? "1px solid rgba(255,255,255,0.07)" : "none",
                  background: isFull
                    ? "transparent"
                    : "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                  color: isFull ? "#52525b" : "#fff",
                  fontFamily: "inherit", flexShrink: 0,
                  opacity: join.isPending ? 0.65 : 1,
                  boxShadow: isFull ? "none" : "0 2px 10px rgba(230,57,70,0.25)",
                }}
              >
                {join.isPending ? "…" : isFull ? "Waitlist" : "Join"}
              </motion.button>
            ) : (
              <Link href="/login" style={{ textDecoration: "none" }}>
                <span style={{
                  display: "block",
                  padding: "7px 16px", borderRadius: 9, fontSize: 12, fontWeight: 700,
                  background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                  color: "#fff", flexShrink: 0,
                  boxShadow: "0 2px 10px rgba(230,57,70,0.25)",
                }}>
                  Sign in
                </span>
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function PlayPage() {
  const [filters, setFilters] = useState<GameFilters>({});
  const [search,  setSearch]  = useState("");
  const { data, isLoading, error } = useGames({ ...filters, q: search || undefined });

  const set = (k: keyof GameFilters, v: string) =>
    setFilters(p => ({ ...p, [k]: v === "all" || !v ? undefined : v }));
  const hasFilters = Object.values(filters).some(Boolean) || !!search;

  return (
    <div style={{ minHeight: "100vh", background: "#050505" }}>
      <NavBar />

      {/* Background */}
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
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 48 }}>
          <SectionHeader
            title="Find Your Game"
            subtitle="Pickup games happening near you in Kozhikode"
            badge="Live games today"
          />
          <Link href="/create-game" style={{ textDecoration: "none", flexShrink: 0 }}>
            <motion.div
              whileHover={{ scale: 1.04, boxShadow: "0 8px 30px rgba(230,57,70,0.35)" }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "11px 22px", borderRadius: 11, fontSize: 13, fontWeight: 700,
                background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                color: "#fff",
                boxShadow: "0 4px 20px rgba(230,57,70,0.28)",
              }}
            >
              <Plus size={14} /> Create Game
            </motion.div>
          </Link>
        </div>

        <AIBanner type="games" />

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search size={15} color="#52525b" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <Input
            style={{ paddingLeft: 42 }}
            placeholder="Search games, sports, venues…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Sport pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
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

        {/* Cost + clear */}
        <div style={{ display: "flex", gap: 5, marginBottom: 32, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#3f3f46", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Cost</span>
          {[{ v: "all", l: "All" }, { v: "free", l: "Free" }, { v: "paid", l: "Paid" }].map(({ v, l }) => {
            const active = filters.cost === v || (v === "all" && !filters.cost);
            return (
              <motion.button
                key={v}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => set("cost", v)}
                style={{
                  padding: "4px 11px", borderRadius: 100, fontSize: 12, fontWeight: 500,
                  cursor: "pointer", border: "1px solid", fontFamily: "inherit",
                  background: active ? "rgba(230,57,70,0.07)" : "transparent",
                  color: active ? "#e63946" : "#71717a",
                  borderColor: active ? "rgba(230,57,70,0.22)" : "rgba(255,255,255,0.06)",
                  transition: "all 0.18s",
                }}
              >
                {l}
              </motion.button>
            );
          })}
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
                ✕ Clear
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <p style={{ fontSize: 12, color: "#3f3f46", marginBottom: 24, letterSpacing: "0.02em" }}>
          {isLoading ? "Loading…" : error ? "Failed to load" : `${data?.length ?? 0} games available`}
        </p>

        {/* Games grid */}
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
                  borderRadius: 18, overflow: "hidden", height: 360,
                }}>
                  <Skeleton style={{ height: 195, borderRadius: 0 }} />
                  <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                    <Skeleton style={{ height: 16, width: "65%" }} />
                    <Skeleton style={{ height: 12, width: "50%" }} />
                    <Skeleton style={{ height: 12, width: "55%" }} />
                  </div>
                </div>
              ))
            : error
            ? <p style={{ gridColumn: "1/-1", textAlign: "center", padding: "64px 0", color: "#ef4444", fontSize: 14 }}>Failed to load games. Please refresh.</p>
            : !data?.length
            ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ gridColumn: "1/-1", textAlign: "center", padding: "80px 0" }}
              >
                <div style={{ fontSize: 40, marginBottom: 16 }}>⚽</div>
                <p style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No games found</p>
                <p style={{ color: "#52525b", fontSize: 14, marginBottom: 28 }}>Be the first — create a game!</p>
                <Link href="/create-game" style={{ textDecoration: "none" }}>
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    style={{
                      display: "inline-block",
                      padding: "12px 28px", borderRadius: 11, fontSize: 14, fontWeight: 700,
                      background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                      color: "#fff",
                      boxShadow: "0 4px 20px rgba(230,57,70,0.28)",
                    }}
                  >
                    Create Game
                  </motion.div>
                </Link>
              </motion.div>
            )
            : data.map((game, i) => <GameCard key={game.id} game={game} index={i} />)
          }
        </motion.div>
      </main>
    </div>
  );
}
