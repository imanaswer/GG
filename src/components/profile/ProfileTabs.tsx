"use client";
export function ProfileTabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 22 }}>
      {tabs.map(t => {
        const on = t === active;
        return (
          <button key={t} onClick={() => onChange(t)} style={{
            background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
            padding: "10px 14px", fontSize: 13.5, fontWeight: on ? 800 : 600,
            color: on ? "#fff" : "rgba(255,255,255,0.5)", borderBottom: on ? "2px solid #980808" : "2px solid transparent",
            whiteSpace: "nowrap",
          }}>{t}</button>
        );
      })}
    </div>
  );
}
