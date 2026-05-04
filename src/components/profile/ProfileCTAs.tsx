"use client";
import Link from "next/link";
import { Send, Swords, Share2, Pencil, Trophy } from "lucide-react";
import { toast } from "sonner";

import type { UserProfile } from "@/hooks/useData";

const baseBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 7,
  padding: "10px 16px", borderRadius: 100,
  fontSize: 13, fontWeight: 700, fontFamily: "inherit",
  cursor: "pointer", textDecoration: "none",
  border: "1px solid",
  transition: "all 180ms ease",
};

const primary: React.CSSProperties = {
  ...baseBtn,
  background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
  color: "#fff",
  borderColor: "transparent",
  boxShadow: "0 4px 18px rgba(230,57,70,0.35)",
};

const ghost: React.CSSProperties = {
  ...baseBtn,
  background: "rgba(255,255,255,0.03)",
  color: "rgba(255,255,255,0.85)",
  borderColor: "rgba(255,255,255,0.1)",
};

export function ProfileCTAs({ profile, isOwn }: { profile: UserProfile; isOwn: boolean }) {
  const profileUrl = typeof window !== "undefined" ? `${window.location.origin}/profile/${profile.id}` : `/profile/${profile.id}`;
  const firstName = profile.name.split(" ")[0];

  if (isOwn) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Link href="/create-game" style={primary}>
          <Send size={14} /> Create a game
        </Link>
        <Link href="/leaderboard" style={ghost}>
          <Trophy size={13} /> Leaderboard
        </Link>
        <Link href="/profile/edit" style={ghost}>
          <Pencil size={13} /> Edit profile
        </Link>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(profileUrl);
            toast.success("Profile link copied");
          }}
          style={ghost}
        >
          <Share2 size={13} /> Share
        </button>
      </div>
    );
  }

  const inviteText = encodeURIComponent(
    `Hey ${firstName}, want to play a game? Find one on Game Ground or create one together: ${typeof window !== "undefined" ? window.location.origin : ""}/play`,
  );
  const challengeText = encodeURIComponent(
    `${firstName}, game on? Let's set up a match. ${typeof window !== "undefined" ? window.location.origin : ""}/create-game`,
  );

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      <a
        href={`https://wa.me/?text=${inviteText}`}
        target="_blank" rel="noopener noreferrer"
        style={primary}
      >
        <Send size={14} /> Invite to a game
      </a>
      <a
        href={`https://wa.me/?text=${challengeText}`}
        target="_blank" rel="noopener noreferrer"
        style={ghost}
      >
        <Swords size={13} /> Challenge
      </a>
      <Link href="/leaderboard" style={ghost}>
        <Trophy size={13} /> Leaderboard
      </Link>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(profileUrl);
          toast.success("Profile link copied");
        }}
        style={ghost}
      >
        <Share2 size={13} /> Share profile
      </button>
    </div>
  );
}
