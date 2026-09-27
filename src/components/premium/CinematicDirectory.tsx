"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { GraduationCap, Users, Trophy, Target, Lightbulb, Medal } from "lucide-react";
import Link from "next/link";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { HyperText } from "@/components/ui/hyper-text";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

gsap.registerPlugin(ScrollTrigger);

const CARDS = [
  {
    id: "train",
    tag: "01 — TRAIN",
    title: "Learn",
    desc: "Coaches & academies, verified in person.",
    bullets: ["50+ expert coaches", "Flexible schedules", "Every skill level"],
    linkText: "Explore Learn ↗",
    link: "/learn",
    image: "/cinematic/coaches_v2.jpg",
    themeColor: "#fff", // Red
    icon: GraduationCap,
    mobileOnly: false,
  },
  {
    id: "play",
    tag: "02 — PLAY",
    title: "Play",
    desc: "Pickup games, five minutes from home.",
    bullets: ["Instant matching", "Local courts", "Skill-matched partners"],
    linkText: "Explore Play ↗",
    link: "/play",
    image: "/cinematic/games_og.jpg",
    themeColor: "#f59e0b", // Orange
    icon: Users,
  },
  {
    id: "compete",
    tag: "03 — COMPETE",
    title: "Events",
    desc: "Tournaments and city-wide competitions.",
    bullets: ["Open tournaments", "Cash prizes", "Official leagues"],
    linkText: "Explore Events ↗",
    link: "/events",
    image: "/cinematic/events_v2.jpg",
    themeColor: "#a855f7", // Purple
    icon: Trophy,
  },
  {
    id: "grow",
    tag: "04 — GROW",
    title: "Camps",
    desc: "Intensive programs that build athletes.",
    bullets: ["Multi-day camps", "Skill development", "Certifications"],
    linkText: "Explore Camps ↗",
    link: "/camps",
    image: "/cinematic/camps_color.jpg",
    themeColor: "#fff", // Red
    icon: Target,
  },
  {
    id: "master",
    tag: "05 — MASTER",
    title: "Workshops",
    desc: "Focused sessions that sharpen your craft.",
    bullets: ["Expert-led classes", "Hands-on drills", "Small group format"],
    linkText: "Explore Workshops ↗",
    link: "/workshops",
    image: "/cinematic/workshops_2.jpg",
    themeColor: "#06b6d4", // Cyan
    icon: Lightbulb,
  },
  {
    id: "leaderboard",
    tag: "06 — RANK",
    title: "Leaderboard",
    desc: "Track your stats and climb the local ranks.",
    bullets: ["City rankings", "Player stats", "Monthly rewards"],
    linkText: "View Leaderboard ↗",
    link: "/leaderboard",
    image: "/cinematic/leaderboard_hero.jpg",
    themeColor: "#eab308", // Yellow
    icon: Medal,
    mobileOnly: true,
  },
];

function PathwayCard({ card, index }: { card: typeof CARDS[0], index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
      viewport={{ once: true, margin: "-50px" }}
      className={`pathway-card-wrapper ${card.mobileOnly ? 'mobile-only-card' : ''}`}
    >
      <Link href={card.link} className="pathway-card">
        <div className="pathway-card-inner">
          {/* Top Image Section */}
          <div className="pathway-image-wrapper">
            <Image src={card.image} alt={card.title} fill style={{ objectFit: "cover" }} quality={90} />
            <div className="pathway-image-gradient" />
            
            <div className="pathway-tag">
              {card.tag}
            </div>
            <div className="pathway-icon">
              <card.icon size={16} color={card.themeColor} />
            </div>
          </div>

          {/* Content Section */}
          <div className="pathway-content">
            <h3 className="pathway-title">{card.title}</h3>
            <p className="pathway-desc">{card.desc}</p>
            
            <ul className="pathway-bullets">
              {card.bullets.map((b, i) => (
                <li key={i}>
                  <span className="bullet-dot" style={{ backgroundColor: card.themeColor }} />
                  {b}
                </li>
              ))}
            </ul>

            <div className="pathway-link" style={{ color: card.themeColor }}>
              {card.linkText}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function CinematicDirectory() {
  const containerRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!headerRef.current) return;
    const trigger = ScrollTrigger.create({
      trigger: headerRef.current,
      start: "top 80%",
      onEnter: () => setInView(true),
    });
    return () => trigger.kill();
  }, []);



  return (
    <section className="directory-section" ref={containerRef}>
      <div className="directory-header" ref={headerRef} style={{ minHeight: "120px" }}>
        {inView && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <HyperText
              text="THE PLAYBOOK"
              className="directory-title"
              duration={1000}
            />
            <ScrollReveal
              baseOpacity={0}
              enableBlur={true}
              blurStrength={5}
              staggerDelay={0.04}
              textClassName="directory-subtitle"
            >
              Master every aspect of the game.
            </ScrollReveal>

          </div>
        )}
      </div>

      <div className="pathways-container">
        <div className="pathways-grid" ref={gridRef}>
          {CARDS.map((card, i) => (
            <PathwayCard key={card.id} card={card} index={i} />
          ))}
        </div>
      </div>

      <style>{`
        .directory-section {
          background-color: #000000;
          padding: 120px 5vw;
          min-height: 100vh;
        }

        .directory-header {
          margin-bottom: 60px;
        }

        .directory-title {
          font-family: 'DM Mono', monospace;
          font-size: 14px;
          letter-spacing: 0.25em;
          color: #747574;
          margin-bottom: 12px;
          text-transform: uppercase;
        }

        .directory-subtitle {
          font-family: 'Instrument Serif', serif;
          font-size: clamp(40px, 5vw, 64px);
          color: #F5F5F3;
          line-height: 1;
        }

        .pathways-container {
          max-width: 1600px;
          margin: 0 auto;
        }

        .pathways-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 20px;
        }

        .pathway-card-wrapper {
          display: block;
          height: 100%;
        }
        
        .mobile-only-card {
          display: none;
        }

        .pathway-card {
          display: block;
          text-decoration: none;
          border-radius: 20px;
          background: #0D0D0D;
          border: 1px solid rgba(255,255,255,0.2);
          overflow: hidden;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s ease;
          position: relative;
          height: 100%;
        }

        .pathway-card:hover {
          transform: translateY(-8px);
          border-color: rgba(255,255,255,0.4);
        }

        .pathway-card-inner {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .pathway-image-wrapper {
          position: relative;
          height: 240px;
          width: 100%;
        }

        .pathway-image-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(13,13,13,0) 40%, #0D0D0D 100%);
        }

        .pathway-tag {
          position: absolute;
          top: 16px;
          left: 16px;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 6px 14px;
          border-radius: 100px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #fff;
        }

        .pathway-icon {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.1);
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pathway-content {
          padding: 0 24px 32px 24px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          margin-top: -12px;
          position: relative;
          z-index: 2;
        }

        .pathway-title {
          font-family: var(--font-sans), sans-serif;
          font-size: 32px;
          font-weight: 800;
          color: #fff;
          margin-bottom: 12px;
          letter-spacing: -0.02em;
        }

        .pathway-desc {
          font-size: 14px;
          color: rgba(255,255,255,0.5);
          line-height: 1.5;
          margin-bottom: 28px;
        }

        .pathway-bullets {
          list-style: none;
          padding: 0;
          margin: 0 0 36px 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .pathway-bullets li {
          font-size: 13px;
          color: rgba(255,255,255,0.7);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .bullet-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .pathway-link {
          margin-top: auto;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
        }

        @media (max-width: 1400px) {
          .pathways-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
          }
        }

        @media (max-width: 768px) {
          .directory-section {
            padding: 60px 12px;
          }
          .pathways-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .pathway-card-wrapper {
            height: auto;
          }
          .mobile-only-card {
            display: block;
          }
          .pathway-image-wrapper {
            height: 140px;
          }
          .pathway-tag {
            font-size: 8px;
            padding: 4px 8px;
            top: 12px;
            left: 12px;
          }
          .pathway-icon {
            width: 28px;
            height: 28px;
            top: 12px;
            right: 12px;
          }
          .pathway-content {
            padding: 0 16px 20px 16px;
            margin-top: -8px;
          }
          .pathway-title {
            font-size: 22px;
            margin-bottom: 8px;
          }
          .pathway-desc {
            font-size: 11px;
            margin-bottom: 16px;
          }
          .pathway-bullets {
            margin-bottom: 20px;
            gap: 10px;
          }
          .pathway-bullets li {
            font-size: 10px;
            gap: 8px;
          }
          .pathway-link {
            font-size: 11px;
          }
        }
      `}</style>
    </section>
  );
}
