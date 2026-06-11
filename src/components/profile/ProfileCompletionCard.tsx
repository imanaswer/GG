"use client";
import { Check } from "lucide-react";
import type { ProfileCompletion } from "@/hooks/useData";

export function ProfileCompletionCard({ completion }: { completion: ProfileCompletion }) {
  if (completion.pct >= 100) return null;
  return (
    <div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>Profile Completion</span>
        <span style={{ fontSize: 16, fontWeight: 900, color: "#4ade80" }}>{completion.pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 100, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 12 }}>
        <div style={{ width: `${completion.pct}%`, height: "100%", background: "linear-gradient(90deg,#22c55e,#4ade80)", borderRadius: 100, transition: "width .6s ease" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {completion.items.map(it => (
          <div key={it.key} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5, color: it.done ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.8)" }}>
            <span style={{ width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: it.done ? "#22c55e" : "rgba(255,255,255,0.08)", flexShrink: 0 }}>
              {it.done && <Check size={11} color="#000" />}
            </span>
            <span style={{ textDecoration: it.done ? "line-through" : "none" }}>{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
