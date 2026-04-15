export const metadata = { title: "Offline" };

export default function Offline() {
  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(230,57,70,0.14) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center", position: "relative" }}>
        <div style={{
          width: 96, height: 96, borderRadius: 22, margin: "0 auto 28px",
          background: "#E63946", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 10px 40px rgba(230,57,70,0.35)",
        }}>
          <span style={{ fontSize: 42, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff" }}>GG</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 10px" }}>You&apos;re offline</h1>
        <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6, margin: "0 0 24px" }}>
          Game Ground needs a connection for live games, bookings, and payments. Your last-viewed pages are still available from cache — check back once you&apos;re online.
        </p>
        <a href="/" style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          height: 44, padding: "0 22px", borderRadius: 10, fontSize: 14, fontWeight: 700,
          background: "#E63946", color: "#fff", textDecoration: "none",
        }}>Try again</a>
      </div>
    </div>
  );
}
