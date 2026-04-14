import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", background: "#080808",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 20, padding: 24, textAlign: "center",
    }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(230,57,70,0.08) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 120, fontWeight: 900, color: "rgba(230,57,70,0.15)", lineHeight: 1, letterSpacing: "-0.06em" }}>404</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", marginTop: -16, letterSpacing: "-0.03em" }}>Page not found</div>
        <p style={{ fontSize: 15, color: "#6b7280", marginTop: 12, maxWidth: 360, margin: "12px auto 0" }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
          <Link href="/" style={{ padding: "12px 28px", borderRadius: 10, background: "#e63946", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>
            Go Home
          </Link>
          <Link href="/play" style={{ padding: "12px 28px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", color: "#d1d5db", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
            Browse Games
          </Link>
        </div>
      </div>
    </div>
  );
}
