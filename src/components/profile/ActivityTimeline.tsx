"use client";
import Link from "next/link";
import { useUserActivity } from "@/hooks/useData";

function ago(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (m < 1) return "just now";
  if (h < 1) return `${m}m ago`;
  if (d < 1) return `${h}h ago`;
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}

export function ActivityTimeline({ userId }: { userId: string }) {
  const { data } = useUserActivity(userId);
  const items = (data?.items ?? []).slice(0, 5);

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>Recent Activity</span>
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)" }}>No activity yet — join a game to get started.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {items.map((it, i) => (
            <div key={it.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingBottom: i === items.length - 1 ? 0 : 14 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{it.icon}</span>
                {i !== items.length - 1 && <span style={{ width: 1, flex: 1, minHeight: 16, background: "rgba(255,255,255,0.08)", marginTop: 4 }} />}
              </div>
              <div style={{ paddingTop: 4 }}>
                <div style={{ fontSize: 13, color: "#e5e7eb" }}>{it.text}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>{ago(it.ts)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
