"use client";
import { Sparkles } from "lucide-react";

export function MotivationCard({ message }: { message: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: "linear-gradient(135deg, rgba(152,8,8,0.12), #0d0d0d)", border: "1px solid rgba(152,8,8,0.25)", borderRadius: 16, padding: "16px 18px" }}>
      <span style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(152,8,8,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Sparkles size={18} color="#980808" />
      </span>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{message}</div>
    </div>
  );
}
