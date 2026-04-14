import { NavBar } from "@/components/NavBar";
import Link from "next/link";
export const metadata = { title: "About Game Ground — Kozhikode's Sports Platform", description: "Learn how Game Ground makes sports accessible for everyone in Kozhikode, Kerala." };
export default function About() {
  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <NavBar />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.04em", marginBottom: 14 }}>
            Making sports as accessible as<br /><span style={{ color: "#e63946" }}>ordering a ride.</span>
          </h1>
          <p style={{ fontSize: 17, color: "#9ca3af", lineHeight: 1.7, maxWidth: 540, margin: "0 auto" }}>
            Game Ground is Kozhikode's hyperlocal sports platform — connecting players with quality coaches, pickup games, summer camps, and tournaments across Malabar.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 48 }}>
          {[
            { n: "500+", l: "Active Players" }, { n: "50+", l: "Verified Coaches" },
            { n: "200+", l: "Games Played" },  { n: "15+", l: "Sports Available" },
          ].map(({ n, l }) => (
            <div key={l} style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "20px", textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#e63946", letterSpacing: "-0.04em" }}>{n}</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 5 }}>{l}</div>
            </div>
          ))}
        </div>

        {[
          { title: "Our Mission", body: "Sports should be for everyone. We built Game Ground because finding a coach or a pickup game in Kozhikode was unnecessarily hard. No phone calls, no middlemen — just tap, join, and play." },
          { title: "Built for Kerala", body: "Every feature is designed for how people in Kerala actually use sports. WhatsApp-first, UPI payments, Malayalam-friendly locations, and coaches you can meet in person the same day." },
          { title: "Powered by AI", body: "Our Claude AI engine matches you with the right coach for your skill level and schedule, and finds the perfect game for your ability. The more you use Game Ground, the smarter it gets." },
        ].map(({ title, body }) => (
          <div key={title} style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "22px 24px", marginBottom: 14 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{title}</h2>
            <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.75 }}>{body}</p>
          </div>
        ))}

        <div style={{ textAlign: "center", marginTop: 48 }}>
          <p style={{ fontSize: 15, color: "#6b7280", marginBottom: 20 }}>Questions or partnership enquiries?</p>
          <a href="mailto:hello@gameground.in" style={{ display: "inline-block", padding: "12px 28px", borderRadius: 10, background: "#e63946", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>hello@gameground.in</a>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 20 }}>
            <Link href="/terms" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>Terms</Link>
            <Link href="/privacy" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>Privacy</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
