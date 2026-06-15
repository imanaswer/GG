"use client";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight, ArrowRight, ArrowDown, MapPin, Users, Trophy, Sparkles, GraduationCap, Target, Lightbulb, type LucideIcon } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { PremiumNav } from "@/components/premium/PremiumNav";
import { SmoothScroll } from "@/components/premium/SmoothScroll";
import { SplitText } from "@/components/premium/SplitText";
import { Reveal, Stagger } from "@/components/premium/Reveal";
import { Parallax } from "@/components/premium/Parallax";
import { Magnetic } from "@/components/premium/Magnetic";
import { SPORT_TILES, STORY, HERO_BACKDROPS, CAMP_IMAGE, EVENT_IMAGE, WORKSHOP_IMAGE } from "@/lib/premium-images";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const HeroParticles = dynamic(() => import("@/components/premium/HeroParticles"), {
  ssr: false,
  loading: () => null,
});

const SPORTS = ["Basketball", "Football", "Cricket", "Badminton", "Tennis", "Volleyball", "Fitness"] as const;

/* ──────────────────────────────────────────────────────── */

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40 });
  return (
    <motion.div
      style={{
        position: "fixed", top: 0, left: 0, right: 0,
        height: 2, background: "linear-gradient(90deg, #e63946, #ff6b74)",
        transformOrigin: "0%", scaleX, zIndex: 200,
      }}
    />
  );
}

/* ── Hero ───────────────────────────────────────────────── */

function Hero() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, -120]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);

  return (
    <section style={{
      position: "relative",
      height: "100vh",
      minHeight: 720,
      overflow: "hidden",
      background: "#050505",
    }}>
      {/* Background image (atmospheric, dimmed) */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.28 }}>
        <Image
          src={HERO_BACKDROPS[0].src}
          alt={HERO_BACKDROPS[0].alt}
          fill
          priority
          quality={85}
          sizes="100vw"
          style={{ objectFit: "cover", filter: "saturate(0.6)" }}
        />
      </div>

      {/* Gradient overlays for legibility */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(5,5,5,0.4) 0%, rgba(5,5,5,0.1) 40%, rgba(5,5,5,0.95) 100%)",
      }} />
      <div className="hero-halo" />

      {/* WebGL particle field */}
      <div style={{ position: "absolute", inset: 0 }}>
        <HeroParticles />
      </div>

      {/* Subtle grid */}
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 70%)",
        }}
      />

      {/* Content */}
      <motion.div
        style={{
          position: "relative", zIndex: 2,
          height: "100%",
          display: "flex", flexDirection: "column", justifyContent: "center",
          y, opacity,
        }}
      >
        <div className="container-lg" style={{ textAlign: "center", maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "8px 16px", borderRadius: 100,
              background: "rgba(230,57,70,0.08)",
              border: "1px solid rgba(230,57,70,0.25)",
              marginBottom: 32,
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#e63946", boxShadow: "0 0 12px #e63946",
              animation: "pulse 2s ease-in-out infinite",
            }} />
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.16em",
              textTransform: "uppercase", color: "#ff6b74",
            }}>
              Kozhikode&apos;s Sports Playbook
            </span>
          </motion.div>

          {/* Display headline */}
          <h1 className="display" style={{
            fontSize: "clamp(52px, 11vw, 168px)",
            color: "#fff",
            maxWidth: 1200, margin: "0 auto",
          }}>
            <span style={{ display: "block" }}>
              <SplitText text="Learn." as="span" />{" "}
              <SplitText text="Play." delay={0.15} as="span" />
            </span>
            <span
              className="display-serif gradient-red"
              style={{
                display: "block",
                fontSize: "0.96em",
                marginTop: "0.06em",
                letterSpacing: "-0.015em",
              }}
            >
              <SplitText text="Connect." delay={0.35} as="span" />
            </span>
          </h1>

          {/* Subhead */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.75 }}
            style={{
              fontSize: "clamp(15px, 1.4vw, 19px)",
              color: "rgba(255,255,255,0.62)",
              maxWidth: 560, margin: "36px auto 0",
              lineHeight: 1.6,
              fontWeight: 400,
            }}
          >
            Your go-to app for coaches, pickup games, camps, and tournaments in Kozhikode.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9 }}
            style={{
              display: "flex", gap: 12, justifyContent: "center",
              marginTop: 40, flexWrap: "wrap",
            }}
          >
            <Magnetic strength={10}>
              <Link href="/learn" style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: "16px 28px", borderRadius: 100,
                background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                color: "#fff", fontSize: 15, fontWeight: 600,
                boxShadow: "0 0 40px rgba(230,57,70,0.45)",
                textDecoration: "none",
              }}>
                Find a coach
                <ArrowUpRight size={16} />
              </Link>
            </Magnetic>
            <Magnetic strength={8}>
              <Link href="/play" style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: "16px 28px", borderRadius: 100,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(12px)",
                color: "#fff", fontSize: 15, fontWeight: 500,
                textDecoration: "none",
              }}>
                Join a pickup game
                <ArrowRight size={16} />
              </Link>
            </Magnetic>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        style={{
          position: "absolute", bottom: 32, left: "50%",
          transform: "translateX(-50%)", zIndex: 2,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          color: "rgba(255,255,255,0.4)",
        }}
      >
        <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase" }}>
          Scroll to explore
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown size={16} />
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ── Marquee band ───────────────────────────────────────── */

function Marquee() {
  const items = [
    "Built for Kozhikode",
    "verified coaches",
    "Games each week",
    "All kinds of sports",
    "Beachside to indoor courts",
    "Trusted by players",
  ];
  return (
    <div style={{
      position: "relative",
      padding: "40px 0",
      borderTop: "1px solid rgba(255,255,255,0.05)",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      background: "rgba(10,10,10,0.6)",
      overflow: "hidden",
    }}>
      <motion.div
        className="marquee-track"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 52, repeat: Infinity, ease: "linear" }}
      >
        {[...items, ...items, ...items].map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 64, flexShrink: 0 }}>
            <span style={{
              fontFamily: "var(--font-serif)", fontStyle: "italic",
              fontSize: "clamp(28px, 4vw, 48px)",
              color: "rgba(255,255,255,0.9)",
              whiteSpace: "nowrap",
            }}>
              {t}
            </span>
            <span style={{ color: "#e63946", fontSize: 20 }}>✦</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ── Quick navigation hub ───────────────────────────────── */

type HubCard = {
  href: string;
  eyebrow: string;
  title: string;
  tagline: string;
  bullets: string[];
  icon: LucideIcon;
  image: string;
  imageAlt: string;
  accent: string;
};

const HUB_CARDS: HubCard[] = [
  {
    href: "/learn",
    eyebrow: "01 — Train",
    title: "Learn",
    tagline: "Coaches & academies, verified in person.",
    bullets: ["50+ expert coaches", "Flexible schedules", "Every skill level"],
    icon: GraduationCap,
    image: STORY.learn.src,
    imageAlt: STORY.learn.alt,
    accent: "#ff6b74",
  },
  {
    href: "/play",
    eyebrow: "02 — Play",
    title: "Play",
    tagline: "Pickup games, five minutes from home.",
    bullets: ["Instant matching", "Local courts", "Skill-matched partners"],
    icon: Users,
    image: STORY.play.src,
    imageAlt: STORY.play.alt,
    accent: "#f97316",
  },
  {
    href: "/events",
    eyebrow: "03 — Compete",
    title: "Events",
    tagline: "Tournaments and city-wide competitions.",
    bullets: ["Open tournaments", "Cash prizes", "Official leagues"],
    icon: Trophy,
    image: EVENT_IMAGE.src,
    imageAlt: EVENT_IMAGE.alt,
    accent: "#a855f7",
  },
  {
    href: "/camps",
    eyebrow: "04 — Grow",
    title: "Camps",
    tagline: "Intensive programs that build athletes.",
    bullets: ["Multi-day camps", "Skill development", "Certifications"],
    icon: Target,
    image: CAMP_IMAGE.src,
    imageAlt: CAMP_IMAGE.alt,
    accent: "#e63946",
  },
  {
    href: "/workshops",
    eyebrow: "05 — Master",
    title: "Workshops",
    tagline: "Focused sessions that sharpen your craft.",
    bullets: ["Expert-led classes", "Hands-on drills", "Small group format"],
    icon: Lightbulb,
    image: WORKSHOP_IMAGE.src,
    imageAlt: WORKSHOP_IMAGE.alt,
    accent: "#22d3ee",
  },
];

function HubCardItem({ card }: { card: HubCard }) {
  const Icon = card.icon;
  return (
    <Link
      href={card.href}
      data-stagger
      className="hub-card"
      style={{
        position: "relative",
        display: "flex", flexDirection: "column",
        background: "#0a0a0a",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 20,
        overflow: "hidden",
        textDecoration: "none",
        transition: "border-color 360ms ease, transform 360ms ease, box-shadow 360ms ease",
        isolation: "isolate",
      }}
    >
      <div style={{ position: "relative", aspectRatio: "5/4", overflow: "hidden" }}>
        <Image
          src={card.image}
          alt={card.imageAlt}
          fill
          sizes="(max-width: 640px) 90vw, (max-width: 1100px) 45vw, 320px"
          quality={80}
          style={{
            objectFit: "cover",
            filter: "saturate(0.85) brightness(0.85)",
            transition: "transform 800ms cubic-bezier(0.16,1,0.3,1), filter 500ms",
          }}
          className="hub-card-img"
        />
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(140deg, ${card.accent}25 0%, transparent 55%)`,
          mixBlendMode: "screen",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, transparent 30%, rgba(10,10,10,0.6) 85%, #0a0a0a 100%)",
        }} />

        <div style={{
          position: "absolute", top: 16, right: 16,
          width: 40, height: 40, borderRadius: 12,
          background: "rgba(10,10,10,0.6)",
          border: `1px solid ${card.accent}40`,
          backdropFilter: "blur(10px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: card.accent,
          boxShadow: `0 0 24px ${card.accent}20`,
        }}>
          <Icon size={17} strokeWidth={2} />
        </div>

        <div style={{
          position: "absolute", top: 16, left: 16,
          padding: "5px 10px",
          borderRadius: 100,
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(8px)",
          fontSize: 10, fontWeight: 600, letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.75)",
        }}>
          {card.eyebrow}
        </div>
      </div>

      <div style={{ padding: "24px 26px 26px", display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
        <div>
          <h3 className="display" style={{ fontSize: 30, color: "#fff", marginBottom: 8 }}>
            {card.title}
          </h3>
          <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.58)", lineHeight: 1.55 }}>
            {card.tagline}
          </p>
        </div>

        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          {card.bullets.map(b => (
            <li key={b} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "rgba(255,255,255,0.6)" }}>
              <span style={{
                width: 4, height: 4, borderRadius: "50%",
                background: card.accent, flexShrink: 0,
                boxShadow: `0 0 8px ${card.accent}90`,
              }} />
              {b}
            </li>
          ))}
        </ul>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          paddingTop: 14,
          borderTop: "1px solid rgba(255,255,255,0.05)",
          fontSize: 13, fontWeight: 600,
          color: card.accent,
        }}>
          Explore {card.title}
          <ArrowUpRight size={14} className="hub-card-arrow" style={{ transition: "transform 320ms cubic-bezier(0.16,1,0.3,1)" }} />
        </div>
      </div>
    </Link>
  );
}

function QuickHub() {
  return (
    <section className="section-tight">
      <div className="container-lg">
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 56, gap: 24, flexWrap: "wrap" }}>
          <Reveal>
            <div style={{ maxWidth: 640 }}>
              <span className="eyebrow" style={{ color: "#e63946", display: "block", marginBottom: 16 }}>
                Four ways in
              </span>
              <h2 className="display" style={{ fontSize: "clamp(36px, 4.5vw, 64px)", color: "#fff" }}>
                Pick your{" "}
                <span className="display-serif" style={{ color: "rgba(255,255,255,0.7)" }}>entry.</span>
              </h2>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", maxWidth: 320, lineHeight: 1.6 }}>
              Whether you&apos;re here to train, drop in, compete, or level up — jump straight to what you need.
            </p>
          </Reveal>
        </div>

        <Stagger stagger={0.08} y={32} style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 28 }} className="hub-grid">
          {HUB_CARDS.map(c => <HubCardItem key={c.href} card={c} />)}
        </Stagger>
      </div>

      <style>{`
        .hub-card:hover { 
          transform: translateY(-4px); 
          border-color: rgba(255,255,255,0.12) !important; 
          box-shadow: 0 0 0 1px rgba(230,57,70,0.3), 0 30px 80px rgba(0,0,0,0.5); 
        }
        .hub-card:hover .hub-card-img { transform: scale(1.06); filter: saturate(1) brightness(0.95) !important; }
        .hub-card:hover .hub-card-arrow { transform: translate(3px, -3px); }
        @media (max-width: 1200px) {
          .hub-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 900px) {
          .hub-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .hub-grid { grid-template-columns: 1fr !important; }
          .hub-card > div:last-child { padding: 32px 20px 26px !important; }
        }
      `}</style>
    </section>
  );
}

/* ── Sports grid ────────────────────────────────────────── */

function SportsGrid() {
  return (
    <section className="section-tight">
      <div className="container-lg">
        <div style={{ maxWidth: 820, marginBottom: 72 }}>
          <Reveal>
            <span className="eyebrow" style={{ color: "#e63946", display: "block", marginBottom: 20 }}>
              Every sport
            </span>
            <h2 className="display" style={{ fontSize: "clamp(36px, 4.5vw, 64px)", color: "#fff" }}>
              Pick your game.{" "}
              <span className="display-serif" style={{ color: "rgba(255,255,255,0.7)" }}>
                We&apos;ll bring the court.
              </span>
            </h2>
          </Reveal>
        </div>

        <Stagger className="sports-grid-layout">
          {SPORTS.map(sport => {
            const img = SPORT_TILES[sport];
            return (
              <Link
                key={sport}
                href={`/learn?sport=${sport}`}
                data-stagger
                style={{
                  position: "relative",
                  aspectRatio: "4/5",
                  overflow: "hidden",
                  borderRadius: 18,
                  background: "#0a0a0a",
                  border: "1px solid rgba(255,255,255,0.05)",
                  textDecoration: "none",
                  display: "block",
                  isolation: "isolate",
                  minHeight: 44,
                }}
                className="sport-tile"
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1200px) 33vw, 260px"
                  style={{
                    objectFit: "cover",
                    filter: "grayscale(0.4) brightness(0.75)",
                    transition: "transform 700ms cubic-bezier(0.16,1,0.3,1), filter 500ms",
                  }}
                />
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.9) 100%)",
                }} />
                <div style={{
                  position: "absolute", bottom: 20, left: 20, right: 20,
                  display: "flex", alignItems: "flex-end", justifyContent: "space-between",
                }} className="sport-tile-content">
                  <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }} className="sport-tile-title">
                    {sport}
                  </span>
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 34, height: 34, borderRadius: "50%",
                    background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                  }} className="sport-tile-icon">
                    <ArrowUpRight size={15} />
                  </span>
                </div>
              </Link>
            );
          })}
        </Stagger>
      </div>
      <style>{`
        .sport-tile:hover img { transform: scale(1.06); filter: grayscale(0) brightness(0.9); }
        .sports-grid-layout {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }
        @media (max-width: 640px) {
          .sports-grid-layout { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .sport-tile { aspectRatio: 1 / 1 !important; border-radius: 12px !important; }
          .sport-tile-content { bottom: 12px !important; left: 12px !important; right: 12px !important; }
          .sport-tile-title { font-size: 18px !important; }
          .sport-tile-icon { display: none !important; }
        }
      `}</style>
    </section>
  );
}

/* ── Stats counter ──────────────────────────────────────── */

function Counter({ from = 0, to, suffix = "" }: { from?: number; to: number; suffix?: string }) {
  const [val, setVal] = useState(from);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obj = { n: from };
    const tween = gsap.to(obj, {
      n: to,
      duration: 2,
      ease: "power3.out",
      onUpdate: () => setVal(Math.round(obj.n)),
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
    });
    return () => { tween.scrollTrigger?.kill(); tween.kill(); };
  }, [from, to]);

  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

function Stats() {
  const items = [
    { value: 147, suffix: "+", label: "Players on the waitlist", icon: Users },
    { value: 12, suffix: "", label: "Founding coaches onboard", icon: Trophy },
    { value: 3, suffix: " sports", label: "Available at launch", icon: Sparkles },
    { value: 1, suffix: " city", label: "Live now · more coming", icon: MapPin },
  ];

  return (
    <section className="section-tight" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="container-lg">
        <Reveal>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 56, flexWrap: "wrap", gap: 20 }}>
            <div style={{ maxWidth: 560 }}>
              <span className="eyebrow" style={{ color: "#e63946", display: "block", marginBottom: 16 }}>
                Early days
              </span>
              <h2 className="display" style={{ fontSize: "clamp(32px, 4vw, 56px)", color: "#fff" }}>
                Small numbers,<br />real ones.
              </h2>
            </div>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", maxWidth: 320 }}>
              We just launched. These are live numbers — no inflating, no rounding up.
            </p>
          </div>
        </Reveal>

        <Stagger style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 1,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 24, overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
          maxWidth: 960, margin: "0 auto",
        }} className="stats-grid">
          {items.map(({ value, suffix, label, icon: Icon }) => (
            <div
              key={label}
              data-stagger
              style={{
                position: "relative",
                padding: "32px 24px",
                background: "#080808",
                display: "flex", flexDirection: "column", justifyContent: "space-between",
                gap: 24,
                overflow: "hidden",
                isolation: "isolate",
              }}
              className="stat-card"
            >
              <div style={{
                position: "absolute", top: -20, right: -20,
                width: 100, height: 100,
                background: "radial-gradient(circle, rgba(230,57,70,0.12) 0%, transparent 70%)",
                borderRadius: "50%",
                pointerEvents: "none",
                zIndex: -1,
              }} className="stat-glow" />

              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(230,57,70,0.08)",
                border: "1px solid rgba(230,57,70,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={17} color="#e63946" />
              </div>

              <div>
                <div style={{ fontFamily: "var(--font-sans)", fontWeight: 900, fontSize: "clamp(36px, 5vw, 52px)", color: "#fff", letterSpacing: "-0.04em", lineHeight: 1 }}>
                  <Counter to={value} suffix={suffix} />
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 8, letterSpacing: "0.02em", lineHeight: 1.4 }}>
                  {label}
                </div>
              </div>
            </div>
          ))}
        </Stagger>
      </div>

      <style>{`
        .stat-card { transition: background 300ms ease; }
        .stat-card:hover { background: #0a0a0a !important; }
        .stat-card:hover .stat-glow { background: radial-gradient(circle, rgba(230,57,70,0.25) 0%, transparent 70%) !important; }
        @media (max-width: 640px) {
          .stats-grid { margin-top: 80px !important; }
        }
      `}</style>
    </section>
  );
}

/* ── Big CTA ────────────────────────────────────────────── */

function BigCTA() {
  return (
    <section className="section">
      <div className="container-lg" style={{ textAlign: "center" }}>
        <div style={{ marginBottom: 20 }}>
          <span style={{
            padding: "6px 12px",
            borderRadius: 100,
            fontSize: "12px",
            fontWeight: 600,
            color: "#52b788",
            background: "rgba(45, 106, 79, 0.1)",
            border: "1px solid rgba(82,183,136,0.3)",
            display: "inline-block",
          }}>
            🌴 Proudly Kozhikode
          </span>
        </div>

        <Reveal>
          <span className="eyebrow" style={{ color: "#e63946", display: "block", marginBottom: 28 }}>
            Your move
          </span>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="display" style={{ fontSize: "clamp(48px, 8vw, 140px)", color: "#fff", maxWidth: 1100, margin: "0 auto 48px" }}>
            Your next match{" "}
            <span className="display-serif" style={{ color: "#ff6b74" }}>
              starts here.
            </span>
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Magnetic strength={12}>
              <Link href="/register" style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: "18px 32px", borderRadius: 100,
                background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
                boxShadow: "0 0 50px rgba(230,57,70,0.45)",
                color: "#fff", fontSize: 15, fontWeight: 700,
                textDecoration: "none",
                minHeight: 44,
              }}>
                Create free account <ArrowUpRight size={16} />
              </Link>
            </Magnetic>
            <Magnetic strength={10}>
              <Link href="/play" style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: "18px 32px", borderRadius: 100,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "#fff", fontSize: 15, fontWeight: 600,
                textDecoration: "none",
                minHeight: 44,
              }}>
                Browse games <ArrowRight size={16} />
              </Link>
            </Magnetic>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Footer ─────────────────────────────────────────────── */

function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid rgba(255,255,255,0.06)",
      padding: "72px 0 48px",
      marginTop: 60,
      background: "#0a0a0a",
    }}>
      {/* Centered container */}
      <div style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "0 24px",
        width: "100%",
      }}>

        {/* 4-column grid with explicit row alignment */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 40,
          marginBottom: 64,
          alignItems: "start", // Force alignment baseline to the top
        }}>

          {/* Column 1: Logo & Info */}
          <div>
            <Link href="/" style={{ display: "inline-block", marginBottom: 24, textDecoration: "none" }}>
              <img src="/logo2.png" alt="Game Ground" style={{ height: 48, width: "auto", display: "block" }} />
            </Link>
            <p style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.6,
              marginBottom: 20,
              marginTop: 0,
              maxWidth: "100%",
              textAlign: "left"
            }}>
              Kozhikode's hyperlocal sports platform. Learn. Play. Connect.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
              <MapPin size={14} />
              <span>Built in Kozhikode, Kerala</span>
            </div>
          </div>

          {/* Column 2: Discover */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <h4 style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)",
              marginBottom: 24,
              marginTop: 14, // Aligns perfectly down matching logo base line
              lineHeight: 1,
            }}>
              DISCOVER
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", textAlign: "left" }}>
              <Link href="/learn" style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", textDecoration: "none", display: "block" }}>
                Coaches
              </Link>
              <Link href="/play" style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", textDecoration: "none", display: "block" }}>
                Games
              </Link>
              <Link href="/camps" style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", textDecoration: "none", display: "block" }}>
                Camps
              </Link>
              <Link href="/events" style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", textDecoration: "none", display: "block" }}>
                Events
              </Link>
            </div>
          </div>

          {/* Column 3: Company */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <h4 style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)",
              marginBottom: 24,
              marginTop: 14,
              lineHeight: 1,
            }}>
              COMPANY
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", textAlign: "left" }}>
              <Link href="/about" style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", textDecoration: "none", display: "block" }}>
                About
              </Link>
              <Link href="/search" style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", textDecoration: "none", display: "block" }}>
                Search
              </Link>
            </div>
          </div>

          {/* Column 4: Legal */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <h4 style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)",
              marginBottom: 24,
              marginTop: 14,
              lineHeight: 1,
            }}>
              LEGAL
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", textAlign: "left" }}>
              <Link href="/privacy" style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", textDecoration: "none", display: "block" }}>
                Privacy
              </Link>
              <Link href="/terms" style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", textDecoration: "none", display: "block" }}>
                Terms
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          paddingTop: 32,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            © {new Date().getFullYear()} Game Ground. All rights reserved.
          </span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            Photography by Unsplash contributors.
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ── Page with global styles ───────────────────────────────── */

export default function LandingPage() {
  return (
    <>
      <SmoothScroll />
      <ScrollProgress />
      <PremiumNav variant="transparent" />

      {/* Global styles - background, text size, green accents, touch targets */}
      <style jsx global>{`
        body {
          background: #0a0a0a !important;
        }
        main {
          background: #0a0a0a;
        }
        body, p, li, a, button, input, textarea, select {
          font-size: 16px;
          line-height: 1.6;
        }
        .display-serif, h1.display, h2.display, h3.display {
          letter-spacing: -0.02em !important;
        }
        .accent-green {
          color: #52b788;
        }
        .border-green {
          border-color: #2d6a4f;
        }
        .bg-green-subtle {
          background: rgba(45, 106, 79, 0.1);
        }
        button, a, .clickable {
          min-height: 44px;
          min-width: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>

      <main style={{ color: "#fff", position: "relative" }}>
        <Hero />
        <Marquee />
        <QuickHub />
        <SportsGrid />
        <Stats />
        <BigCTA />
        <Footer />
      </main>
    </>
  );
}