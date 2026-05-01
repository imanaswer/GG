"use client";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const STORAGE_KEY = "tier_announce_v1_dismissed";

export function TierAnnouncementToast() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY)) return;

    const t = setTimeout(() => {
      toast("Tiers got an upgrade", {
        description: "Bronze → Silver → Gold → Elite → Pro. See your new rank on the leaderboard.",
        action: {
          label: "See rank",
          onClick: () => { window.location.href = "/leaderboard"; },
        },
        duration: 12_000,
      });
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    }, 1200);

    return () => clearTimeout(t);
  }, [user]);

  return null;
}
