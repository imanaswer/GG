"use client";
export function ProfileTabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="profile-tabs-container" style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 40, overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
      <style>{`
        .profile-tabs-container::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {tabs.map(t => {
        const on = t === active;
        return (
          <button key={t} onClick={() => onChange(t)} style={{
            background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
            padding: "14px 20px 14px 0", fontSize: 13, fontWeight: 600,
            color: on ? "#fff" : "rgba(255,255,255,0.35)",
            textTransform: "uppercase", letterSpacing: "0.12em",
            borderBottom: on ? "1px solid #fff" : "1px solid transparent",
            marginBottom: -1,
            transition: "color 300ms ease",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}>{t}</button>
        );
      })}
    </div>
  );
}
