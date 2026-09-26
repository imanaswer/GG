"use client";
import { Check } from "lucide-react";
import type { ProfileCompletion } from "@/hooks/useData";

export function ProfileCompletionCard({ completion }: { completion: ProfileCompletion }) {
  if (completion.pct >= 100) return null;
  return (
    <div style={{
      borderTop: "1px solid rgba(255,255,255,0.08)",
      paddingTop: 28, paddingBottom: 28,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.15em" }}>Profile Completion</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{completion.pct}%</span>
      </div>
      {/* Ultra thin progress bar */}
      <div style={{ height: 2, borderRadius: 100, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 20 }}>
        <div style={{ width: `${completion.pct}%`, height: "100%", background: "#fff", borderRadius: 100, transition: "width .6s ease" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {completion.items.map(it => (
          <div key={it.key} style={{
            display: "flex", alignItems: "center", gap: 10,
            fontSize: 13, color: it.done ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.7)",
          }}>
            <span style={{
              width: 18, height: 18, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: it.done ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
              border: it.done ? "none" : "1px solid rgba(255,255,255,0.1)",
              flexShrink: 0,
            }}>
              {it.done && <Check size={11} color="rgba(255,255,255,0.6)" />}
            </span>
            <span style={{ textDecoration: it.done ? "line-through" : "none" }}>{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
