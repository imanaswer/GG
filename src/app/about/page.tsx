import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, Sparkles, MapPin, Shield, Zap, Users } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { HERO_BACKDROPS, STORY } from "@/lib/premium-images";

export const metadata = {
  title: "About Game Ground — Kozhikode's Sports Platform",
  description: "How Game Ground makes sports as accessible as ordering a ride — hyperlocal, coach-verified, and built for Kerala.",
};

const STATS = [
  { n: "500+", l: "Active players" },
  { n: "50+",  l: "Verified coaches" },
  { n: "200+", l: "Games organised" },
  { n: "15+",  l: "Sports supported" },
];

const VALUES = [
  {
    Icon: Shield,
    title: "Trust by default",
    body: "Every coach is verified in person before a single rupee changes hands. No ghost profiles, no middlemen — just people you can actually meet on the court tomorrow.",
  },
  {
    Icon: Heart,
    title: "Built with Kerala",
    body: "WhatsApp-first messaging, UPI payments, Malayalam-friendly places and a team that plays the same courts you do. We're not building for Kozhikode — we're building in it.",
  },
  {
    Icon: Zap,
    title: "Instant, always",
    body: "Tap, join, play. The shortest possible path from wanting to play to actually playing — because momentum is what separates the people who show up from the people who don't.",
  },
];

const CHAPTERS: Array<{
  kicker: string;
  title: string;
  body: string;
  image: { src: string; alt: string };
  reverse?: boolean;
}> = [
  {
    kicker: "Our mission",
    title: "Sports should be as easy to start as a cab ride.",
    body: "We built Game Ground because finding a coach, a court or a pickup game in Kozhikode meant endless phone calls, half-answered DMs and awkward WhatsApp groups. That's the tax on showing up — and we wanted it gone. So we made a platform where one tap gets you on the court, with people who actually want to play.",
    image: STORY.play,
  },
  {
    kicker: "Built for Malabar",
    title: "The details only locals catch.",
    body: "Locations that know which lane you mean. UPI at checkout. Coaches who speak your language. A WhatsApp-first feel, not a mass-email one. Every small choice is tuned for the way people in Kerala actually meet, train and play — not the way a Silicon Valley team might imagine it.",
    image: STORY.connect,
    reverse: true,
  },
  {
    kicker: "Intelligence at the core",
    title: "Smart matching, quietly.",
    body: "A Claude-powered engine learns your level, your schedule and the coaches you've loved. It quietly surfaces the next game that's perfect for you — not the loudest listing. The longer you play, the sharper the recommendations get, without you ever having to tweak a filter.",
    image: STORY.learn,
  },
];

export default function About() {
  return (
    <div style={{ minHeight: "100vh", background: "#050505" }}>
      <NavBar />

      {/* HERO */}
      <section style={{ position: "relative", paddingTop: 96, paddingBottom: 88, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <Image
            src={HERO_BACKDROPS[1].src}
            alt={HERO_BACKDROPS[1].alt}
            fill
            priority
            quality={85}
            sizes="100vw"
            style={{ objectFit: "cover", opacity: 0.45 }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, rgba(5,5,5,0.6) 0%, rgba(5,5,5,0.75) 55%, #050505 100%)",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse 70% 50% at 20% 30%, rgba(230,57,70,0.18) 0%, transparent 60%)",
          }} />
        </div>

        <div className="container-lg" style={{ position: "relative", zIndex: 1, maxWidth: 1120, margin: "0 auto", padding: "56px 24px 0" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 14px", borderRadius: 100,
            background: "rgba(230,57,70,0.12)",
            border: "1px solid rgba(230,57,70,0.3)",
            fontSize: 12, fontWeight: 600, color: "#ff6b7a",
            letterSpacing: "0.08em", textTransform: "uppercase",
            marginBottom: 28,
          }}>
            <Sparkles size={12} /> About Game Ground
          </div>

          <h1 style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(44px, 6vw, 84px)",
            lineHeight: 1.02,
            fontWeight: 400,
            color: "#fff",
            letterSpacing: "-0.04em",
            maxWidth: 880,
            marginBottom: 28,
          }}>
            Making sports as accessible as <em style={{ fontStyle: "italic", color: "#ff6b7a" }}>ordering a ride</em>.
          </h1>

          <p style={{
            fontSize: 18, color: "rgba(255,255,255,0.7)",
            lineHeight: 1.65, maxWidth: 640,
            marginBottom: 0,
          }}>
            Game Ground is Kozhikode&apos;s hyperlocal sports platform — connecting players with verified coaches, pickup games, summer camps and tournaments across Malabar. Coach-first. Community-backed. Built here.
          </p>
        </div>
      </section>

      {/* STATS STRIP */}
      <section style={{ position: "relative", zIndex: 2, padding: "0 24px", marginTop: -24, marginBottom: 96 }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 0,
            background: "#0b0b0b",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 20,
            overflow: "hidden",
          }} className="stats-strip">
            {STATS.map(({ n, l }, i) => (
              <div key={l} style={{
                padding: "28px 20px",
                textAlign: "center",
                borderRight: i < STATS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }} className="stat-cell">
                <div style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 44, fontWeight: 400,
                  color: "#fff",
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  marginBottom: 8,
                }}>
                  {n}
                </div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STORY CHAPTERS */}
      <section style={{ padding: "0 24px 96px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", flexDirection: "column", gap: 96 }}>
          {CHAPTERS.map(({ kicker, title, body, image, reverse }) => (
            <article key={title} style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 64,
              alignItems: "center",
            }} className="chapter-grid">
              <div style={{ order: reverse ? 2 : 1 }} className="chapter-text">
                <div style={{ fontSize: 12, fontWeight: 600, color: "#e63946", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 18 }}>
                  {kicker}
                </div>
                <h2 style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(30px, 3.2vw, 44px)",
                  lineHeight: 1.08,
                  fontWeight: 400,
                  color: "#fff",
                  letterSpacing: "-0.03em",
                  marginBottom: 22,
                }}>
                  {title}
                </h2>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.62)", lineHeight: 1.75 }}>
                  {body}
                </p>
              </div>

              <div style={{
                order: reverse ? 1 : 2,
                position: "relative",
                aspectRatio: "4/5",
                borderRadius: 24,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  quality={80}
                  sizes="(max-width: 900px) 100vw, 50vw"
                  style={{ objectFit: "cover" }}
                />
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(180deg, transparent 60%, rgba(5,5,5,0.5) 100%)",
                }} />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* VALUES */}
      <section style={{ padding: "0 24px 96px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#e63946", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 14 }}>
              What we hold on to
            </div>
            <h2 style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(32px, 4vw, 52px)",
              lineHeight: 1.08,
              fontWeight: 400,
              color: "#fff",
              letterSpacing: "-0.03em",
              maxWidth: 720,
              margin: "0 auto",
            }}>
              Three things we refuse to compromise on.
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="values-grid">
            {VALUES.map(({ Icon, title, body }) => (
              <div key={title} style={{
                padding: "32px 28px",
                background: "#0b0b0b",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 20,
                transition: "border-color 200ms ease, transform 200ms ease",
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "rgba(230,57,70,0.1)",
                  border: "1px solid rgba(230,57,70,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 20,
                }}>
                  <Icon size={19} color="#e63946" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em", marginBottom: 10 }}>
                  {title}
                </h3>
                <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.58)", lineHeight: 1.7 }}>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUOTE */}
      <section style={{ padding: "0 24px 96px" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <div style={{
            padding: "56px 56px",
            background: "linear-gradient(135deg, rgba(230,57,70,0.08) 0%, rgba(11,11,11,0.9) 55%, #0b0b0b 100%)",
            border: "1px solid rgba(230,57,70,0.18)",
            borderRadius: 24,
            position: "relative",
            overflow: "hidden",
          }} className="quote-card">
            <div style={{
              position: "absolute", top: 20, left: 44,
              fontFamily: "var(--font-serif)",
              fontSize: 140, lineHeight: 1,
              color: "rgba(230,57,70,0.18)",
              fontWeight: 400,
              pointerEvents: "none",
            }}>
              &ldquo;
            </div>
            <blockquote style={{
              position: "relative",
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(22px, 2.6vw, 30px)",
              lineHeight: 1.4,
              fontWeight: 400,
              color: "#fff",
              letterSpacing: "-0.015em",
              marginBottom: 28,
              paddingTop: 32,
            }}>
              We&apos;re not trying to digitise sports. We&apos;re trying to get more people off the couch, onto the court, and into a rhythm where showing up is the default — not the friction.
            </blockquote>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, color: "#fff", fontSize: 15,
                boxShadow: "0 4px 14px rgba(230,57,70,0.35)",
              }}>
                GG
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Game Ground Team</div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)" }}>Built in Kozhikode, Kerala</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "0 24px 96px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{
            padding: "52px 48px",
            background: "#0b0b0b",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 24,
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 40,
            alignItems: "center",
          }} className="cta-card">
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#e63946", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 14 }}>
                Say hello
              </div>
              <h2 style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(28px, 3vw, 40px)",
                lineHeight: 1.1,
                fontWeight: 400,
                color: "#fff",
                letterSpacing: "-0.03em",
                marginBottom: 14,
              }}>
                Partnership, press or just a thought?
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, maxWidth: 520 }}>
                We reply to every email. Whether you&apos;re a coach, a venue owner, a tournament organiser or a player who wants to talk — we want to hear from you.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <a href="mailto:hello@gameground.in" style={{
                display: "inline-flex", alignItems: "center", justifyContent: "space-between",
                gap: 10, padding: "18px 22px", borderRadius: 14,
                background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                color: "#fff", textDecoration: "none",
                fontSize: 14, fontWeight: 700,
                boxShadow: "0 10px 32px rgba(230,57,70,0.3), inset 0 1px 0 rgba(255,255,255,0.16)",
              }}>
                <span>hello@gameground.in</span>
                <ArrowRight size={16} />
              </a>
              <a href="https://wa.me/919876543210" style={{
                display: "inline-flex", alignItems: "center", justifyContent: "space-between",
                gap: 10, padding: "18px 22px", borderRadius: 14,
                background: "rgba(255,255,255,0.04)",
                color: "#fff", textDecoration: "none",
                fontSize: 14, fontWeight: 600,
                border: "1px solid rgba(255,255,255,0.08)",
              }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <Users size={16} color="#22c55e" /> WhatsApp us directly
                </span>
                <ArrowRight size={16} />
              </a>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "rgba(255,255,255,0.45)", marginTop: 6 }}>
                <MapPin size={12} /> Calicut, Kerala · 673001
              </div>
            </div>
          </div>

          <div style={{
            display: "flex", justifyContent: "center", gap: 28,
            marginTop: 40,
            fontSize: 13, color: "rgba(255,255,255,0.45)",
          }}>
            <Link href="/terms" style={{ color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>Terms</Link>
            <span>·</span>
            <Link href="/privacy" style={{ color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>Privacy</Link>
            <span>·</span>
            <Link href="/learn" style={{ color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>Explore coaches</Link>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .stats-strip { grid-template-columns: repeat(2, 1fr) !important; }
          .stat-cell:nth-child(2) { border-right: none !important; }
          .stat-cell:nth-child(1), .stat-cell:nth-child(2) { border-bottom: 1px solid rgba(255,255,255,0.06); }
          .chapter-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .chapter-text { order: 1 !important; }
          .values-grid { grid-template-columns: 1fr !important; }
          .quote-card { padding: 40px 28px !important; }
          .cta-card { grid-template-columns: 1fr !important; padding: 36px 28px !important; }
        }
      `}</style>
    </div>
  );
}
