"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, ChevronRight } from "lucide-react";
import { useUserActivity, type ActivityItem } from "@/hooks/useData";

const ease = [0.16, 1, 0.3, 1] as const;

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.round(diff / 86400)}d ago`;
  if (diff < 30 * 86400) return `${Math.round(diff / (7 * 86400))}w ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function RecentActivity({ userId }: { userId: string }) {
  const { data, isLoading } = useUserActivity(userId);
  const items = data?.items ?? [];

  return (
    <div style={{
      background: "#0b0b0b",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 20,
      padding: "20px 22px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Activity size={14} color="#e63946" />
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Recent activity
        </span>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 36, borderRadius: 8 }} />)}
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: "20px 4px", textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: 13 }}>
          No activity yet — join a game to start your story.
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map((item, i) => <ActivityRow key={item.id} item={item} index={i} />)}
        </ul>
      )}
    </div>
  );
}

function ActivityRow({ item, index }: { item: ActivityItem; index: number }) {
  const inner = (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 12px",
      borderRadius: 10,
      transition: "background 180ms",
    }} className="activity-row">
      <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: "rgba(255,255,255,0.82)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.text}
      </span>
      <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap", flexShrink: 0 }}>
        {relativeTime(item.ts)}
      </span>
      {item.href && <ChevronRight size={13} color="rgba(255,255,255,0.35)" style={{ flexShrink: 0 }} />}
      <style>{`
        .activity-row:hover { background: rgba(255,255,255,0.03); }
      `}</style>
    </div>
  );

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease, delay: index * 0.04 }}
    >
      {item.href ? (
        <Link href={item.href} style={{ textDecoration: "none" }}>{inner}</Link>
      ) : (
        inner
      )}
    </motion.li>
  );
}
