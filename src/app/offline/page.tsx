"use client";
import { useEffect, useState } from "react";

export default function Offline() {
  const [online, setOnline] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Auto-reload the moment the connection comes back.
  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      setTimeout(() => window.location.reload(), 600);
    };
    if (typeof navigator !== "undefined" && navigator.onLine) goOnline();
    window.addEventListener("online", goOnline);
    return () => window.removeEventListener("online", goOnline);
  }, []);

  const retry = () => {
    setRetrying(true);
    window.location.reload();
  };

  const links = [
    { label: "Home", href: "/" },
    { label: "Coaches", href: "/learn" },
    { label: "Games", href: "/play" },
    { label: "Camps", href: "/camps" },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "#080808", color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @keyframes ggFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes ggPulse { 0%,100% { opacity: .35; transform: scale(1); } 50% { opacity: .9; transform: scale(1.06); } }
        @keyframes ggRing { 0% { transform: scale(.6); opacity: .6; } 100% { transform: scale(1.8); opacity: 0; } }
        @keyframes ggBlink { 0%,100% { opacity: 1; } 50% { opacity: .25; } }
        @keyframes ggSpin { to { transform: rotate(360deg); } }
        .gg-link:hover { background: rgba(255,255,255,0.07) !important; border-color: rgba(255,255,255,0.18) !important; color:#fff !important; }
        .gg-cta:hover { box-shadow: 0 12px 36px rgba(152,8,8,0.5); transform: translateY(-1px); }
      `}</style>

      {/* ambient brand glow */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 45% at 50% -5%, rgba(152,8,8,0.18) 0%, transparent 60%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 50% 40% at 50% 110%, rgba(152,8,8,0.08) 0%, transparent 60%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 440, textAlign: "center", position: "relative" }}>
        {/* monogram with pulsing rings + offline badge */}
        <div style={{ position: "relative", width: 112, height: 112, margin: "0 auto 30px" }}>
          <span style={{ position: "absolute", inset: 0, borderRadius: 26, border: "1px solid rgba(152,8,8,0.5)", animation: "ggRing 2.4s ease-out infinite" }} />
          <span style={{ position: "absolute", inset: 0, borderRadius: 26, border: "1px solid rgba(152,8,8,0.5)", animation: "ggRing 2.4s ease-out infinite", animationDelay: "1.2s" }} />
          <div style={{
            position: "absolute", inset: 0, borderRadius: 26,
            background: "linear-gradient(135deg, #980808 0%, #6b0505 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 12px 44px rgba(152,8,8,0.4)",
            animation: "ggFloat 4s ease-in-out infinite",
          }}>
            <span style={{ fontSize: 46, fontWeight: 900, letterSpacing: "-0.05em", color: "#fff" }}>GG</span>
          </div>
          {/* wifi-off badge */}
          <div style={{
            position: "absolute", bottom: -4, right: -4, width: 38, height: 38, borderRadius: "50%",
            background: "#141414", border: "3px solid #080808",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 1l22 22" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
          </div>
        </div>

        <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 12px" }}>
          {online ? "Back online" : "You’re offline"}
        </h1>
        <p style={{ fontSize: 14.5, color: "#9ca3af", lineHeight: 1.65, margin: "0 0 26px" }}>
          {online
            ? "Connection restored — reloading Game Ground…"
            : "Game Ground needs a connection for live games, bookings, and payments. Your last-viewed pages are still available from cache."}
        </p>

        {/* live connection status */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 9,
          padding: "8px 16px", borderRadius: 100, marginBottom: 26,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          fontSize: 12.5, color: "#cbd5e1", fontWeight: 600,
        }}>
          <span style={{
            width: 9, height: 9, borderRadius: "50%",
            background: online ? "#4ade80" : "#eab308",
            boxShadow: online ? "0 0 10px #4ade80" : "0 0 10px #eab308",
            animation: online ? "none" : "ggBlink 1.4s ease-in-out infinite",
          }} />
          {online ? "Connected" : "Waiting for connection…"}
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button onClick={retry} disabled={retrying} className="gg-cta" style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
            height: 48, padding: "0 26px", borderRadius: 12, fontSize: 14.5, fontWeight: 700,
            background: "linear-gradient(135deg, #980808 0%, #6b0505 100%)", color: "#fff",
            border: "none", cursor: retrying ? "wait" : "pointer", fontFamily: "inherit",
            boxShadow: "0 8px 28px rgba(152,8,8,0.4)", transition: "transform .15s, box-shadow .15s",
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: retrying ? "ggSpin .8s linear infinite" : "none" }}>
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {retrying ? "Reconnecting…" : "Try again"}
          </button>
        </div>

        {/* quick links to cached sections */}
        <div style={{ marginTop: 34 }}>
          <p style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, fontWeight: 700 }}>
            Jump back in
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center" }}>
            {links.map(l => (
              <a key={l.href} href={l.href} className="gg-link" style={{
                padding: "9px 16px", borderRadius: 100, fontSize: 13, fontWeight: 600,
                background: "rgba(255,255,255,0.03)", color: "#9ca3af",
                border: "1px solid rgba(255,255,255,0.08)", textDecoration: "none",
                transition: "background .15s, border-color .15s, color .15s",
              }}>{l.label}</a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
