"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Sparkles, X, ArrowUpRight } from "lucide-react";

import { TIER_META, type Tier } from "@/lib/reputation";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function TierUpBanner({
  tier,
  tierUpdatedAt,
  isOwn,
}: {
  tier: string;
  tierUpdatedAt?: string;
  isOwn: boolean;
}) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!isOwn || !tierUpdatedAt) return;
    if (tier === "bronze") return;
    const ts = new Date(tierUpdatedAt).getTime();
    if (Number.isNaN(ts)) return;
    if (Date.now() - ts > SEVEN_DAYS_MS) return;
    if (typeof window === "undefined") return;
    const key = `tier_up_dismissed:${ts}`;
    if (window.localStorage.getItem(key)) return;
    // Browser-only post-mount check; setState-in-effect is intentional here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(false);
  }, [tier, tierUpdatedAt, isOwn]);

  if (dismissed || tier === "bronze") return null;
  const meta = TIER_META[tier as Tier] ?? TIER_META.silver;

  const close = () => {
    if (tierUpdatedAt && typeof window !== "undefined") {
      window.localStorage.setItem(`tier_up_dismissed:${new Date(tierUpdatedAt).getTime()}`, "1");
    }
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "relative",
            display: "flex", alignItems: "center", gap: 14,
            padding: "16px 20px",
            background: `linear-gradient(135deg, ${meta.color}1a 0%, ${meta.colorDim}0d 60%, rgba(11,11,11,0.95) 100%)`,
            border: `1px solid ${meta.color}44`,
            borderRadius: 18,
            marginBottom: 18,
            overflow: "hidden",
          }}
        >
          <motion.div
            animate={{ rotate: [0, 14, -10, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            style={{
              width: 44, height: 44, borderRadius: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: `linear-gradient(135deg, ${meta.color} 0%, ${meta.colorDim} 100%)`,
              boxShadow: `0 0 28px ${meta.color}66`,
              flexShrink: 0,
              fontSize: 20,
            }}
          >
            {meta.icon}
          </motion.div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <Sparkles size={13} color={meta.color} />
              <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                Promoted
              </span>
            </div>
            <p style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
              You reached {meta.label}!
            </p>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
              Keep playing to climb the next rung.
            </p>
          </div>
          <Link href="/leaderboard" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "9px 16px", borderRadius: 100,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#fff", fontSize: 12.5, fontWeight: 700, textDecoration: "none",
            whiteSpace: "nowrap",
          }}>
            See rank <ArrowUpRight size={12} />
          </Link>
          <button
            onClick={close}
            aria-label="Dismiss"
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.55)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <X size={13} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
