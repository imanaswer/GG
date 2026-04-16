"use client";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight, ArrowRight, ArrowDown, MapPin, Star, Users, Trophy, Sparkles, GraduationCap, Target, type LucideIcon } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { PremiumNav } from "@/components/premium/PremiumNav";
import { SmoothScroll } from "@/components/premium/SmoothScroll";
import { SplitText } from "@/components/premium/SplitText";
import { Reveal, Stagger } from "@/components/premium/Reveal";
import { Parallax } from "@/components/premium/Parallax";
import { Magnetic } from "@/components/premium/Magnetic";
import { SPORT_TILES, STORY, HERO_BACKDROPS, CAMP_IMAGE, EVENT_IMAGE } from "@/lib/premium-images";

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
        <div className="container-lg" style={{ textAlign: "center" }}>
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
              Kozhikode's Sports Playbook
            </span>
          </motion.div>

          {/* Display headline */}
          <h1 className="display" style={{
            fontSize: "clamp(52px, 11vw, 168px)",
            color: "#fff",
            maxWidth: 1200, margin: "0 auto",
          }}>
            <SplitText text="Learn." as="span" />{" "}
            <SplitText text="Play." delay={0.15} as="span" />{" "}
            <span className="display-serif" style={{
              fontSize: "0.94em",
              background: "linear-gradient(135deg, #e63946 0%, #ff6b74 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              <SplitText text="Connect." delay={0.3} as="span" />
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
            One app to find coaches, join pickup games, and sign up for camps &
            tournaments — anywhere in Kozhikode.
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
    "50+ verified coaches",
    "200+ games each week",
    "12 sports",
    "Beachside to indoor courts",
    "Trusted by 2,400+ players",
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
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
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

/* ── Quick navigation hub (4 category cards) ────────────── */

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
      {/* Image head */}
      <div style={{
        position: "relative",
        aspectRatio: "5/4",
        overflow: "hidden",
      }}>
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
        {/* Accent tint overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(140deg, ${card.accent}25 0%, transparent 55%)`,
          mixBlendMode: "screen",
        }} />
        {/* Gradient to card body */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, transparent 30%, rgba(10,10,10,0.6) 85%, #0a0a0a 100%)",
        }} />

        {/* Icon badge */}
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

        {/* Eyebrow badge */}
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

      {/* Content */}
      <div style={{
        padding: "24px 26px 26px",
        display: "flex", flexDirection: "column", gap: 16, flex: 1,
      }}>
        <div>
          <h3 className="display" style={{
            fontSize: 30,
            color: "#fff",
            marginBottom: 8,
          }}>
            {card.title}
          </h3>
          <p style={{
            fontSize: 13.5,
            color: "rgba(255,255,255,0.58)",
            lineHeight: 1.55,
          }}>
            {card.tagline}
          </p>
        </div>

        <ul style={{
          listStyle: "none", padding: 0, margin: 0,
          display: "flex", flexDirection: "column", gap: 8,
          flex: 1,
        }}>
          {card.bullets.map(b => (
            <li key={b} style={{
              display: "flex", alignItems: "center", gap: 10,
              fontSize: 12.5, color: "rgba(255,255,255,0.6)",
            }}>
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
          <ArrowUpRight
            size={14}
            className="hub-card-arrow"
            style={{ transition: "transform 320ms cubic-bezier(0.16,1,0.3,1)" }}
          />
        </div>
      </div>
    </Link>
  );
}

function QuickHub() {
  return (
    <section className="section-tight">
      <div className="container-lg">
        <div style={{
          display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          marginBottom: 56, gap: 24, flexWrap: "wrap",
        }}>
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
            <p style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.5)",
              maxWidth: 320,
              lineHeight: 1.6,
            }}>
              Whether you're here to train, drop in, compete, or level up — jump
              straight to what you need.
            </p>
          </Reveal>
        </div>

        <Stagger
          stagger={0.08}
          y={32}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
          }}
          className="hub-grid"
        >
          {HUB_CARDS.map(c => <HubCardItem key={c.href} card={c} />)}
        </Stagger>
      </div>

      <style>{`
        .hub-card:hover { transform: translateY(-4px); border-color: rgba(255,255,255,0.12) !important; box-shadow: 0 30px 80px rgba(0,0,0,0.5); }
        .hub-card:hover .hub-card-img { transform: scale(1.06); filter: saturate(1) brightness(0.95) !important; }
        .hub-card:hover .hub-card-arrow { transform: translate(3px, -3px); }
        @media (max-width: 900px) {
          .hub-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .hub-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

/* ── Split story section ────────────────────────────────── */

function StorySection({
  eyebrow, title, description, href, ctaLabel, image, imageAlt, reverse,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  image: string;
  imageAlt: string;
  reverse?: boolean;
}) {
  return (
    <section className="section">
      <div className="container-lg">
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 80,
          alignItems: "center",
        }} className="two-col">
          <Reveal style={{ order: reverse ? 2 : 1 }}>
            <div style={{ maxWidth: 520 }}>
              <span className="eyebrow" style={{ color: "#e63946", display: "inline-block", marginBottom: 24 }}>
                {eyebrow}
              </span>
              <h2 className="display" style={{
                fontSize: "clamp(40px, 5vw, 72px)",
                color: "#fff",
                marginBottom: 28,
              }}>
                {title}
              </h2>
              <p style={{
                fontSize: 17, lineHeight: 1.65,
                color: "rgba(255,255,255,0.6)",
                marginBottom: 36,
              }}>
                {description}
              </p>
              <Magnetic strength={10}>
                <Link href={href} style={{
                  display: "inline-flex", alignItems: "center", gap: 10,
                  padding: "14px 24px", borderRadius: 100,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff", fontSize: 14, fontWeight: 600,
                  textDecoration: "none",
                }}>
                  {ctaLabel}
                  <ArrowUpRight size={15} />
                </Link>
              </Magnetic>
            </div>
          </Reveal>

          <Reveal style={{ order: reverse ? 1 : 2 }} delay={0.1}>
            <div className="frame-img" style={{
              aspectRatio: "4/5",
              position: "relative",
              boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
            }}>
              <Parallax speed={50} style={{ position: "absolute", inset: "-10%" }}>
                <Image
                  src={image}
                  alt={imageAlt}
                  fill
                  sizes="(max-width: 900px) 90vw, 50vw"
                  style={{ objectFit: "cover" }}
                />
              </Parallax>
            </div>
          </Reveal>
        </div>
      </div>
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
                We'll bring the court.
              </span>
            </h2>
          </Reveal>
        </div>

        <Stagger
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
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
                }}>
                  <span style={{
                    fontSize: 20, fontWeight: 800, color: "#fff",
                    letterSpacing: "-0.02em",
                  }}>
                    {sport}
                  </span>
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 34, height: 34, borderRadius: "50%",
                    background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                  }}>
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
      `}</style>
    </section>
  );
}

/* ── Immersive "Connect" full-bleed section ─────────────── */

function Immersive() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <section ref={ref} style={{ position: "relative", minHeight: "80vh" }}>
      <Parallax speed={100} style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", inset: "-10%" }}>
          <Image
            src={STORY.connect.src}
            alt={STORY.connect.alt}
            fill
            sizes="100vw"
            quality={85}
            style={{ objectFit: "cover" }}
          />
        </div>
      </Parallax>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(5,5,5,0.9) 0%, rgba(5,5,5,0.4) 30%, rgba(5,5,5,0.85) 100%)",
      }} />
      <div style={{ position: "relative", padding: "180px 0" }}>
        <div className="container-lg" style={{ textAlign: "center" }}>
          <Reveal>
            <span className="eyebrow" style={{ color: "#ff6b74", display: "block", marginBottom: 28 }}>
              Camps · Tournaments · Community
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="display" style={{
              fontSize: "clamp(44px, 7vw, 120px)",
              color: "#fff",
              maxWidth: 980, margin: "0 auto 40px",
            }}>
              Show up.{" "}
              <span className="display-serif" style={{ color: "#ff6b74" }}>Belong.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p style={{
              fontSize: "clamp(16px, 1.5vw, 20px)",
              color: "rgba(255,255,255,0.72)",
              maxWidth: 620, margin: "0 auto 48px",
              lineHeight: 1.6,
            }}>
              Summer camps that build the next generation. Tournaments that sell out
              every weekend. A city that shows up for its own.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Magnetic strength={10}>
                <Link href="/camps" style={{
                  display: "inline-flex", alignItems: "center", gap: 10,
                  padding: "16px 28px", borderRadius: 100,
                  background: "#fff", color: "#050505",
                  fontSize: 14, fontWeight: 700,
                  textDecoration: "none",
                }}>
                  Browse camps <ArrowUpRight size={15} />
                </Link>
              </Magnetic>
              <Magnetic strength={10}>
                <Link href="/events" style={{
                  display: "inline-flex", alignItems: "center", gap: 10,
                  padding: "16px 28px", borderRadius: 100,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: "#fff", fontSize: 14, fontWeight: 600,
                  textDecoration: "none",
                }}>
                  See events <ArrowRight size={15} />
                </Link>
              </Magnetic>
            </div>
          </Reveal>
        </div>
      </div>
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
    { value: 2400, suffix: "+", label: "Players active", icon: Users },
    { value: 50,   suffix: "+", label: "Verified coaches", icon: Trophy },
    { value: 180,  suffix: "+", label: "Games each week", icon: Sparkles },
    { value: 49,   suffix: "",  label: "Rating · out of 50", icon: Star, isRating: true },
  ];

  return (
    <section className="section-tight" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="container-lg">
        <Reveal>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 56, flexWrap: "wrap", gap: 20 }}>
            <div style={{ maxWidth: 560 }}>
              <span className="eyebrow" style={{ color: "#e63946", display: "block", marginBottom: 16 }}>
                By the numbers
              </span>
              <h2 className="display" style={{ fontSize: "clamp(32px, 4vw, 56px)", color: "#fff" }}>
                A city, on the ground.
              </h2>
            </div>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", maxWidth: 320 }}>
              Updated live from the platform — every game booked, coach verified, camp closed-out.
            </p>
          </div>
        </Reveal>

        <Stagger style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 1,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 20, overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          {items.map(({ value, suffix, label, icon: Icon, isRating }) => (
            <div
              key={label}
              data-stagger
              style={{
                padding: "40px 28px",
                background: "#0a0a0a",
                minHeight: 200,
                display: "flex", flexDirection: "column", justifyContent: "space-between",
              }}
            >
              <Icon size={18} color="#e63946" />
              <div>
                <div style={{
                  fontFamily: "var(--font-sans)", fontWeight: 900,
                  fontSize: "clamp(44px, 5vw, 72px)",
                  color: "#fff", letterSpacing: "-0.04em", lineHeight: 1,
                }}>
                  {isRating ? <>4.<Counter to={9} />/5</> : <Counter to={value} suffix={suffix} />}
                </div>
                <div style={{
                  fontSize: 13, color: "rgba(255,255,255,0.5)",
                  marginTop: 10, letterSpacing: "0.02em",
                }}>
                  {label}
                </div>
              </div>
            </div>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ── Big CTA ────────────────────────────────────────────── */

function BigCTA() {
  return (
    <section className="section">
      <div className="container-lg" style={{ textAlign: "center" }}>
        <Reveal>
          <span className="eyebrow" style={{ color: "#e63946", display: "block", marginBottom: 28 }}>
            Your move
          </span>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="display" style={{
            fontSize: "clamp(48px, 8vw, 140px)",
            color: "#fff",
            maxWidth: 1100, margin: "0 auto 48px",
          }}>
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
    }}>
      <div className="container-lg">
        <div style={{
          display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: 48, marginBottom: 64,
        }} className="four-col">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
              }} />
              <span style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
                Game Ground
              </span>
            </div>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", maxWidth: 320, lineHeight: 1.6 }}>
              Kozhikode's hyperlocal sports platform. Learn. Play. Connect.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 20, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
              <MapPin size={13} />
              <span>Built in Kozhikode, Kerala</span>
            </div>
          </div>

          {[
            { title: "Discover", links: [["Coaches","/learn"],["Games","/play"],["Camps","/camps"],["Events","/events"]] },
            { title: "Company",  links: [["About","/about"],["Search","/search"]] },
            { title: "Legal",    links: [["Privacy","/privacy"],["Terms","/terms"]] },
          ].map(col => (
            <div key={col.title}>
              <div className="eyebrow" style={{ marginBottom: 16, color: "rgba(255,255,255,0.4)" }}>
                {col.title}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {col.links.map(([label, href]) => (
                  <Link key={href} href={href} style={{
                    fontSize: 14, color: "rgba(255,255,255,0.7)",
                    textDecoration: "none",
                  }}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          paddingTop: 28, borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20,
          flexWrap: "wrap", fontSize: 12, color: "rgba(255,255,255,0.35)",
        }}>
          <span>© {new Date().getFullYear()} Game Ground. All rights reserved.</span>
          <span>Photography by Unsplash contributors.</span>
        </div>
      </div>
    </footer>
  );
}

/* ── Page ───────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <>
      <SmoothScroll />
      <ScrollProgress />
      <PremiumNav variant="transparent" />

      <main style={{ background: "#050505", color: "#fff", position: "relative" }}>
        <Hero />

        <Marquee />

        <QuickHub />

        <StorySection
          eyebrow="Learn"
          title="Train with coaches who sweat for it."
          description="50+ verified coaches and academies across Kozhikode. Filter by sport, level and timing — book your trial in a couple of taps."
          href="/learn"
          ctaLabel="Find your coach"
          image={STORY.learn.src}
          imageAlt={STORY.learn.alt}
        />

        <SportsGrid />

        <StorySection
          eyebrow="Play"
          title="Pickup games, five minutes from home."
          description="Join open games posted by your neighbours. Host your own when the court's free. No groups, no WhatsApp scramble — just a map and a clock."
          href="/play"
          ctaLabel="Browse pickup games"
          image={STORY.play.src}
          imageAlt={STORY.play.alt}
          reverse
        />

        <Immersive />

        <Stats />

        <BigCTA />

        <Footer />
      </main>
    </>
  );
}
