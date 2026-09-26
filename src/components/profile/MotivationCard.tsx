"use client";
import { Sparkles } from "lucide-react";

export function MotivationCard({ message }: { message: string }) {
  return (
    <div style={{
      borderTop: "1px solid rgba(255,255,255,0.08)",
      paddingTop: 24, paddingBottom: 12,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <Sparkles size={16} color="rgba(255,255,255,0.3)" />
      <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.5)", fontStyle: "italic" }}>{message}</div>
    </div>
  );
}
