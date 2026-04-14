"use client";
import { useState } from "react";
import { Sparkles, ChevronRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAIRecommendations } from "@/hooks/useData";

/* ── Image with fallback ──────────────────────────────── */
export function Img({
  src, alt, style, className,
}: { src: string; alt: string; style?: React.CSSProperties; className?: string }) {
  const [err, setErr] = useState(false);
  if (err)
    return (
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          display: "flex", alignItems: "center", justifyContent: "center",
          ...style,
        }}
        className={className}
      >
        <span style={{ fontSize: 18, fontWeight: 800, color: "#3f3f46", letterSpacing: "-0.02em" }}>
          {alt[0]?.toUpperCase()}
        </span>
      </div>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src} alt={alt} style={style} className={className}
      onError={() => setErr(true)}
    />
  );
}

/* ── Stars ───────────────────────────────────────────── */
export function Stars({ value, size = 13 }: { value: number; size?: number }) {
  const filled = Math.round(value);
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"
          fill={i <= filled ? "#eab308" : "none"}
          stroke={i <= filled ? "#eab308" : "#3f3f46"}
          strokeWidth={2}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  );
}

/* ── Slot bar ─────────────────────────────────────────── */
export function SlotBar({ filled, total }: { filled: number; total: number }) {
  const pct = Math.min(100, Math.round((filled / total) * 100));
  const color =
    pct >= 100 ? "#ef4444" :
    pct >= 80  ? "#eab308" :
    pct >= 50  ? "#f97316" : "#e63946";
  return (
    <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 99, overflow: "hidden", width: "100%" }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: [0.16,1,0.3,1] }}
        style={{ height: "100%", background: color, borderRadius: 99 }}
      />
    </div>
  );
}

/* ── Skill level badge ────────────────────────────────── */
export function SkillBadge({ level }: { level: string }) {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    Beginner:      { bg: "rgba(34,197,94,0.08)",  color: "#4ade80", border: "rgba(34,197,94,0.2)"  },
    Intermediate:  { bg: "rgba(234,179,8,0.08)",  color: "#fbbf24", border: "rgba(234,179,8,0.2)"  },
    Advanced:      { bg: "rgba(239,68,68,0.08)",  color: "#f87171", border: "rgba(239,68,68,0.2)"  },
    "All Levels":  { bg: "rgba(96,165,250,0.08)", color: "#60a5fa", border: "rgba(96,165,250,0.2)" },
  };
  const s = map[level] ?? { bg: "rgba(255,255,255,0.04)", color: "#a1a1aa", border: "rgba(255,255,255,0.08)" };
  return (
    <span style={{
      display: "inline-flex", padding: "3px 10px", borderRadius: 100,
      fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      {level}
    </span>
  );
}

/* ── Sport badge ──────────────────────────────────────── */
export function SportBadge({ sport }: { sport: string }) {
  return (
    <span style={{
      display: "inline-flex", padding: "3px 10px", borderRadius: 100,
      fontSize: 11, fontWeight: 700,
      background: "rgba(230,57,70,0.1)", color: "#e63946",
      border: "1px solid rgba(230,57,70,0.2)",
    }}>
      {sport}
    </span>
  );
}

/* ── Status badge ─────────────────────────────────────── */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    pending:   { bg: "rgba(234,179,8,0.08)",  color: "#fbbf24", border: "rgba(234,179,8,0.2)"  },
    confirmed: { bg: "rgba(34,197,94,0.08)",  color: "#4ade80", border: "rgba(34,197,94,0.2)"  },
    cancelled: { bg: "rgba(239,68,68,0.08)",  color: "#f87171", border: "rgba(239,68,68,0.2)"  },
    open:      { bg: "rgba(34,197,94,0.08)",  color: "#4ade80", border: "rgba(34,197,94,0.2)"  },
    full:      { bg: "rgba(239,68,68,0.08)",  color: "#f87171", border: "rgba(239,68,68,0.2)"  },
    completed: { bg: "rgba(96,165,250,0.08)", color: "#60a5fa", border: "rgba(96,165,250,0.2)" },
  };
  const s = map[status] ?? { bg: "rgba(255,255,255,0.04)", color: "#a1a1aa", border: "rgba(255,255,255,0.08)" };
  return (
    <span style={{
      display: "inline-flex", padding: "3px 10px", borderRadius: 100,
      fontSize: 11, fontWeight: 600, textTransform: "capitalize",
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      {status}
    </span>
  );
}

/* ── Format date ──────────────────────────────────────── */
export function fmtDate(iso: string) {
  const d    = new Date(iso);
  const now  = new Date();
  const diffH = (d.getTime() - now.getTime()) / 3_600_000;
  const time  = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffH < 0)  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
  if (diffH < 8)  return `Today at ${time}`;
  if (diffH < 32) return `Tomorrow at ${time}`;
  return `${d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} at ${time}`;
}

/* ── AI Recommendations Banner ────────────────────────── */
export function AIBanner({ type }: { type: "games" | "coaches" }) {
  const { data, isLoading } = useAIRecommendations(type);

  if (isLoading) {
    return (
      <div style={{
        marginBottom: 32, padding: "18px 20px", borderRadius: 16,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
            <Sparkles size={14} color="#e63946" />
          </motion.div>
          <span style={{ fontSize: 13, color: "#52525b" }}>Finding the best matches for you…</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 68, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.items?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ marginBottom: 32 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Sparkles size={14} color="#e63946" />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Recommended for you</span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 100,
          background: "rgba(230,57,70,0.08)", color: "#e63946",
          border: "1px solid rgba(230,57,70,0.18)", letterSpacing: "0.05em",
        }}>
          {data.poweredBy === "claude" ? "✦ Claude AI" : "Smart picks"}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 8 }}>
        <AnimatePresence>
          {data.items.slice(0, 3).map((item, i) => {
            const id     = item.id as string;
            const name   = ((item.name ?? item.title) as string) ?? "";
            const sport  = (item.sport as string) ?? "";
            const img    = (item.imageUrl as string) ?? "";
            const reason = (item.aiReason as string) ?? "";
            const href   = type === "coaches" ? `/coach/${id}` : `/game/${id}`;

            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <Link href={href} style={{ textDecoration: "none" }}>
                  <motion.div
                    whileHover={{ borderColor: "rgba(230,57,70,0.35)", y: -2 }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px", borderRadius: 13,
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(230,57,70,0.12)",
                      cursor: "pointer",
                      transition: "border-color 0.2s",
                    }}
                  >
                    <div style={{ width: 46, height: 46, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
                      <Img src={img} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#e63946", marginBottom: 2, letterSpacing: "0.04em" }}>{sport}</div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</p>
                      <p style={{ fontSize: 11, color: "#52525b", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{reason}</p>
                    </div>
                    <ChevronRight size={13} color="#3f3f46" style={{ flexShrink: 0 }} />
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── Section header ────────────────────────────────────── */
export function SectionHeader({
  title, subtitle, badge,
}: { title: string; subtitle?: string; badge?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      style={{ marginBottom: 44, textAlign: "center" }}
    >
      {badge && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 13px", borderRadius: 100,
          background: "rgba(230,57,70,0.07)", border: "1px solid rgba(230,57,70,0.18)",
          fontSize: 11, fontWeight: 700, color: "#e63946",
          marginBottom: 16, letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}>
          <TrendingUp size={10} /> {badge}
        </div>
      )}
      <h1 style={{
        fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 900,
        color: "#fff", letterSpacing: "-0.04em", marginBottom: 8, lineHeight: 1.05,
      }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ fontSize: 15, color: "#52525b" }}>{subtitle}</p>
      )}
    </motion.div>
  );
}
