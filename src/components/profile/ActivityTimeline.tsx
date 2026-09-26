"use client";
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
    <div style={{
      borderTop: "1px solid rgba(255,255,255,0.08)",
      paddingTop: 28, paddingBottom: 12,
    }}>
      <div style={{
        fontSize: 11, color: "rgba(255,255,255,0.35)",
        textTransform: "uppercase", letterSpacing: "0.15em",
        marginBottom: 20,
      }}>
        Recent Activity
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>No activity yet — join a game to get started.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {items.map((it, i) => (
            <div key={it.id} style={{
              display: "flex", gap: 14, alignItems: "flex-start",
              paddingBottom: i === items.length - 1 ? 0 : 18,
            }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13,
                }}>{it.icon}</span>
                {i !== items.length - 1 && <span style={{ width: 1, flex: 1, minHeight: 18, background: "rgba(255,255,255,0.06)", marginTop: 4 }} />}
              </div>
              <div style={{ paddingTop: 3 }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{it.text}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>{ago(it.ts)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
