"use client";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  motion, useInView, AnimatePresence,
  useScroll, useTransform,
  useMotionValue, useSpring,
} from "framer-motion";
import {
  ArrowRight, Menu, X, MapPin, Users, Star,
  BookOpen, Calendar, Trophy, ChevronRight,
  CheckCircle, ChevronLeft,
} from "lucide-react";

/* ─────────────────────────────────────
   Design tokens
───────────────────────────────────── */
const C = {
  white:        "#ffffff",
  bg:           "#f9fafb",
  bgAlt:        "#f3f4f6",
  border:       "#e5e7eb",
  borderDim:    "#f3f4f6",
  accent:       "#dc2626",
  accentDim:    "rgba(220,38,38,0.07)",
  accentBorder: "rgba(220,38,38,0.2)",
  head:         "#0a0a0a",
  body:         "#374151",
  muted:        "#6b7280",
  faint:        "#9ca3af",
  dark:         "#0f172a",
} as const;

const ease = [0.16, 1, 0.3, 1] as const;

/* ─────────────────────────────────────
   Scroll-reveal wrapper
───────────────────────────────────── */
function Reveal({
  children, delay = 0, className,
}: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* Eyebrow label */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 700,
      letterSpacing: "0.12em", textTransform: "uppercase",
      color: C.accent, marginBottom: 14,
    }}>
      {children}
    </span>
  );
}

/* Divider */
function Divider() {
  return <div style={{ height: 1, background: C.border }} />;
}

/* ─────────────────────────────────────
   Scroll progress bar
───────────────────────────────────── */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  return (
    <motion.div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 3,
        background: C.accent, transformOrigin: "0%", scaleX,
        zIndex: 200,
      }}
    />
  );
}

/* ─────────────────────────────────────
   Navigation
───────────────────────────────────── */
const NAV_LINKS = [
  { href: "/learn",  label: "Coaches" },
  { href: "/play",   label: "Games"   },
  { href: "/camps",  label: "Camps"   },
  { href: "/events", label: "Events"  },
  { href: "/about",  label: "About"   },
];

function LandingNav() {
  const [open,      setOpen]      = useState(false);
  const [scrolled,  setScrolled]  = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav style={{
      position:          "sticky",
      top:               0,
      zIndex:            100,
      background:        scrolled ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.85)",
      backdropFilter:    "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      borderBottom:      `1px solid ${scrolled ? C.border : "transparent"}`,
      boxShadow:         scrolled ? "0 2px 16px rgba(0,0,0,0.07)" : "none",
      transition:        "background 0.3s, box-shadow 0.3s, border-color 0.3s",
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto", padding: "0 24px",
        height: 64, display: "flex", alignItems: "center",
        justifyContent: "space-between",
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <motion.div
            whileHover={{ rotate: [0, -8, 8, 0], scale: 1.05 }}
            transition={{ duration: 0.4 }}
            style={{
              width: 32, height: 32, borderRadius: 8, background: C.accent, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </motion.div>
          <span style={{ fontWeight: 800, fontSize: 15, color: C.head, letterSpacing: "-0.03em" }}>
            Game Ground
          </span>
        </Link>

        {/* Desktop links */}
        <div className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {NAV_LINKS.map(n => (
            <Link key={n.href} href={n.href} style={{
              position: "relative", padding: "6px 14px", borderRadius: 7, fontSize: 14,
              fontWeight: 500, color: C.body, textDecoration: "none",
              transition: "color 0.15s, background 0.15s",
            }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.color      = C.head;
                el.style.background = C.bgAlt;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.color      = C.body;
                el.style.background = "transparent";
              }}
            >
              {n.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="desktop-auth" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Link href="/login" style={{
            padding: "8px 16px", borderRadius: 8, fontSize: 14,
            fontWeight: 500, color: C.body, textDecoration: "none",
          }}>
            Sign in
          </Link>
          <Link href="/register" style={{ textDecoration: "none" }}>
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: "8px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                color: C.white, background: C.accent,
                boxShadow: "0 1px 3px rgba(0,0,0,0.15), 0 1px 6px rgba(220,38,38,0.25)",
              }}
            >
              Get started
            </motion.div>
          </Link>
          <button
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle menu"
            className="mobile-menu-btn"
            style={{
              display: "none", padding: 8, color: C.muted,
              background: "none", border: "none", cursor: "pointer",
            }}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease }}
            style={{ overflow: "hidden", borderTop: `1px solid ${C.border}`, background: C.white }}
          >
            <div style={{ padding: "12px 24px 24px", display: "flex", flexDirection: "column", gap: 2 }}>
              {NAV_LINKS.map(n => (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)} style={{
                  padding: "12px 4px", fontSize: 15, fontWeight: 500,
                  color: C.body, textDecoration: "none",
                  borderBottom: `1px solid ${C.borderDim}`,
                }}>
                  {n.label}
                </Link>
              ))}
              <div style={{ display: "flex", gap: 8, paddingTop: 16 }}>
                <Link href="/login" style={{
                  flex: 1, textAlign: "center", padding: "11px",
                  borderRadius: 8, border: `1px solid ${C.border}`,
                  fontSize: 14, fontWeight: 500, color: C.body, textDecoration: "none",
                }}>Sign in</Link>
                <Link href="/register" style={{
                  flex: 1, textAlign: "center", padding: "11px",
                  borderRadius: 8, background: C.accent,
                  fontSize: 14, fontWeight: 600, color: C.white, textDecoration: "none",
                }}>Register</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

/* ─────────────────────────────────────
   Hero — cursor glow
───────────────────────────────────── */
const HERO_WORDS = ["Coach.", "Game.", "Team.", "Sport."];

function Hero() {
  const [wordIdx,  setWordIdx]  = useState(0);
  const [livePing, setLivePing] = useState(true);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const gX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const gY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  const heroRef = useRef<HTMLDivElement>(null);

  // Cycle words
  useEffect(() => {
    const t = setInterval(() => setWordIdx(i => (i + 1) % HERO_WORDS.length), 2200);
    return () => clearInterval(t);
  }, []);

  // Pulse the live dot
  useEffect(() => {
    const t = setInterval(() => setLivePing(v => !v), 1800);
    return () => clearInterval(t);
  }, []);

  const onMouseMove = (e: React.MouseEvent) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  return (
    <section
      ref={heroRef}
      onMouseMove={onMouseMove}
      style={{ background: C.white, padding: "80px 24px 64px", overflow: "hidden", position: "relative" }}
    >
      {/* Cursor glow */}
      <motion.div
        style={{
          position: "absolute", pointerEvents: "none", zIndex: 0,
          width: 480, height: 480, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(220,38,38,0.07) 0%, transparent 70%)",
          translateX: gX, translateY: gY,
          transform: "translate(-50%, -50%)",
        }}
      />

      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>

          {/* Left: Copy */}
          <div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease }}>
              <Eyebrow>Kozhikode&apos;s Sports Platform</Eyebrow>
              <h1 style={{
                fontSize: "clamp(40px, 5.5vw, 68px)",
                fontWeight: 900, lineHeight: 1.04,
                letterSpacing: "-0.04em", color: C.head, marginBottom: 22,
              }}>
                Find a{" "}
                <AnimatePresence mode="wait">
                  <motion.span
                    key={wordIdx}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    transition={{ duration: 0.3, ease }}
                    style={{ color: C.accent, display: "inline-block" }}
                  >
                    {HERO_WORDS[wordIdx]}
                  </motion.span>
                </AnimatePresence>
                <br />
                <span style={{ color: C.head }}>Play Together.</span>
              </h1>
              <p style={{ fontSize: 18, lineHeight: 1.72, color: C.body, maxWidth: 440, marginBottom: 36 }}>
                Game Ground connects athletes, coaches and teams across Kozhikode —
                making sports accessible, social and easy to get into.
              </p>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 40 }}>
                <Link href="/register" style={{ textDecoration: "none" }}>
                  <motion.div
                    whileHover={{ scale: 1.04, boxShadow: "0 6px 20px rgba(220,38,38,0.4)" }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "14px 26px", borderRadius: 10, fontSize: 15, fontWeight: 700,
                      background: C.accent, color: C.white,
                      boxShadow: "0 2px 8px rgba(220,38,38,0.3)",
                    }}
                  >
                    Get started free <ArrowRight size={16} />
                  </motion.div>
                </Link>
                <Link href="/learn" style={{ textDecoration: "none" }}>
                  <motion.div
                    whileHover={{ scale: 1.03, borderColor: C.accent, color: C.accent }}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "14px 26px", borderRadius: 10, fontSize: 15, fontWeight: 600,
                      background: C.white, color: C.head,
                      border: `1px solid ${C.border}`,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      transition: "color 0.2s, border-color 0.2s",
                    }}
                  >
                    Browse coaches
                  </motion.div>
                </Link>
              </div>

              {/* Trust line */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ display: "flex" }}>
                  {["#dc2626", "#1d4ed8", "#16a34a", "#d97706"].map((bg, i) => (
                    <div key={i} style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: bg, border: "2px solid white",
                      marginLeft: i > 0 ? -8 : 0, zIndex: 4 - i,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 800, color: "white", position: "relative",
                    }}>
                      {["A", "R", "P", "K"][i]}
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
                  Join <strong style={{ color: C.head }}>500+ players</strong> already on Game Ground
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right: Hero image */}
          <motion.div
            className="hero-image-col"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease }}
            style={{ position: "relative" }}
          >
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.4 }}
              style={{
                borderRadius: 20, overflow: "hidden", aspectRatio: "4/3",
                boxShadow: "0 24px 64px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.08)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1546519638399-1274d96f2a0a?w=900&q=85"
                alt="Athletes playing basketball in Kozhikode"
                style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }}
              />
            </motion.div>

            {/* Floating stats card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.5, ease }}
              whileHover={{ y: -3, boxShadow: "0 14px 40px rgba(0,0,0,0.18)" }}
              style={{
                position: "absolute", bottom: -20, left: -24,
                background: C.white, borderRadius: 14,
                padding: "16px 20px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
                border: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", gap: 12, minWidth: 220,
                cursor: "default",
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: C.accentDim,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Star size={20} color={C.accent} fill={C.accent} />
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 800, color: C.head, margin: 0, letterSpacing: "-0.03em" }}>4.9 / 5</p>
                <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Average coach rating</p>
              </div>
            </motion.div>

            {/* Live badge */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.6, ease }}
              style={{
                position: "absolute", top: 16, right: -16,
                background: C.head, borderRadius: 12,
                padding: "10px 16px",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <motion.div
                animate={{ scale: livePing ? [1, 1.6, 1] : 1, opacity: livePing ? [1, 0.4, 1] : 1 }}
                transition={{ duration: 0.8 }}
                style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }}
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.white }}>
                3 games live now
              </span>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-image-col { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .desktop-nav { display: none !important; }
          .desktop-auth { display: none !important; }
        }
      `}</style>
    </section>
  );
}

/* ─────────────────────────────────────
   Animated counter
───────────────────────────────────── */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref     = useRef<HTMLSpanElement>(null);
  const inView  = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.ceil(to / 40);
    const t = setInterval(() => {
      start += step;
      if (start >= to) { setCount(to); clearInterval(t); }
      else setCount(start);
    }, 30);
    return () => clearInterval(t);
  }, [inView, to]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ─────────────────────────────────────
   Stats bar
───────────────────────────────────── */
const STATS = [
  { to: 500,  suffix: "+", label: "Active players",   icon: <Users    size={18} color={C.accent} /> },
  { to: 50,   suffix: "+", label: "Verified coaches", icon: <BookOpen size={18} color={C.accent} /> },
  { to: 200,  suffix: "+", label: "Games played",     icon: <Trophy   size={18} color={C.accent} /> },
  { to: 15,   suffix: "",  label: "Sports available", icon: <Calendar size={18} color={C.accent} /> },
];

function StatsBar() {
  return (
    <section style={{ background: C.bg, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          {STATS.map(({ to, suffix, label, icon }, i) => (
            <Reveal key={label} delay={i * 0.08}>
              <motion.div
                whileHover={{ background: C.white }}
                transition={{ duration: 0.2 }}
                style={{
                  padding: "32px 24px", textAlign: "center",
                  borderRight: i < 3 ? `1px solid ${C.border}` : "none",
                  borderRadius: 4,
                }}
              >
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>{icon}</div>
                <p style={{
                  fontSize: "clamp(28px, 3vw, 40px)", fontWeight: 900,
                  color: C.head, margin: 0, letterSpacing: "-0.04em", lineHeight: 1,
                }}>
                  <Counter to={to} suffix={suffix} />
                </p>
                <p style={{ fontSize: 13, color: C.muted, margin: "6px 0 0", fontWeight: 500 }}>{label}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   Offerings
───────────────────────────────────── */
const OFFERINGS = [
  {
    href:    "/learn",
    icon:    <BookOpen size={22} color={C.accent} />,
    title:   "Find a Coach",
    desc:    "Browse 50+ verified coaches and academies. Filter by sport, skill level, and session type — then book directly, no calls needed.",
    bullets: ["Verified profiles", "Real availability", "Book online"],
    img:     "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=640&q=80",
    label:   "Learn",
  },
  {
    href:    "/play",
    icon:    <Trophy size={22} color={C.accent} />,
    title:   "Join a Game",
    desc:    "Find pickup games near you happening today. See skill levels, check slot availability, and join instantly — free or paid.",
    bullets: ["Live availability", "Skill-level matching", "Organiser ratings"],
    img:     "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=640&q=80",
    label:   "Play",
  },
  {
    href:    "/events",
    icon:    <Calendar size={22} color={C.accent} />,
    title:   "Compete",
    desc:    "Tournaments, leagues and camps for every level. Register as an individual or bring your team and play for prize money.",
    bullets: ["Tournaments & leagues", "Summer camps", "Prize pools"],
    img:     "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=640&q=80",
    label:   "Compete",
  },
];

function OfferingCard({ href, icon, title, desc, bullets, img, label }: typeof OFFERINGS[0]) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={href} style={{ textDecoration: "none", display: "block", height: "100%" }}>
      <motion.div
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        whileHover={{ y: -6, boxShadow: "0 20px 56px rgba(0,0,0,0.12)" }}
        transition={{ duration: 0.25, ease }}
        style={{
          height: "100%", borderRadius: 16, overflow: "hidden",
          border: `1px solid ${hovered ? C.accentBorder : C.border}`,
          background: C.white,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          display: "flex", flexDirection: "column",
          transition: "border-color 0.25s",
        }}
      >
        {/* Image with zoom */}
        <div style={{ position: "relative", height: 180, overflow: "hidden", flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <motion.img
            src={img} alt={title}
            animate={{ scale: hovered ? 1.06 : 1 }}
            transition={{ duration: 0.5, ease }}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)",
          }} />
          <span style={{
            position: "absolute", top: 12, left: 12,
            fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", color: C.white,
            background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
            padding: "4px 10px", borderRadius: 100,
          }}>
            {label}
          </span>
        </div>

        <div style={{ padding: "24px", flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: 10 }}>{icon}</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: C.head, marginBottom: 8, letterSpacing: "-0.02em" }}>
            {title}
          </h3>
          <p style={{ fontSize: 14, color: C.body, lineHeight: 1.65, marginBottom: 20, flex: 1 }}>{desc}</p>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 7, marginBottom: 20 }}>
            {bullets.map(b => (
              <li key={b} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.muted }}>
                <CheckCircle size={13} color={C.accent} style={{ flexShrink: 0 }} /> {b}
              </li>
            ))}
          </ul>
          <motion.div
            animate={{ x: hovered ? 4 : 0 }}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 600, color: C.accent }}
          >
            Explore <ChevronRight size={15} />
          </motion.div>
        </div>
      </motion.div>
    </Link>
  );
}

function Offerings() {
  return (
    <section style={{ background: C.white, padding: "96px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Eyebrow>What we offer</Eyebrow>
            <h2 style={{
              fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 800,
              color: C.head, letterSpacing: "-0.035em", marginBottom: 14, lineHeight: 1.1,
            }}>
              One platform for everything
            </h2>
            <p style={{ fontSize: 17, color: C.body, maxWidth: 480, margin: "0 auto" }}>
              Whether you&apos;re learning a new sport, playing casually, or competing seriously — Game Ground has you covered.
            </p>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {OFFERINGS.map((o, i) => (
            <Reveal key={o.title} delay={i * 0.1}>
              <OfferingCard {...o} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   Sports categories
───────────────────────────────────── */
const SPORTS = [
  { name: "Cricket",    img: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=500&q=80"  },
  { name: "Football",   img: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=500&q=80"  },
  { name: "Badminton",  img: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=500&q=80"  },
  { name: "Basketball", img: "https://images.unsplash.com/photo-1546519638399-1274d96f2a0a?w=500&q=80"  },
  { name: "Tennis",     img: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=500&q=80"     },
  { name: "Fitness",    img: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=500&q=80"  },
];

function SportCard({ name, img }: { name: string; img: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={`/learn?sport=${name}`} style={{ textDecoration: "none", display: "block" }}>
      <motion.div
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.22, ease }}
        style={{
          position: "relative", borderRadius: 14, overflow: "hidden",
          aspectRatio: "4/3", cursor: "pointer",
          boxShadow: hovered
            ? "0 16px 48px rgba(0,0,0,0.2)"
            : "0 2px 8px rgba(0,0,0,0.08)",
          transition: "box-shadow 0.3s",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <motion.img
          src={img} alt={name}
          animate={{ scale: hovered ? 1.08 : 1 }}
          transition={{ duration: 0.5, ease }}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />

        {/* Gradient — intensifies on hover */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0.7 }}
          style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)",
          }}
        />

        {/* Bottom info */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 16px" }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: C.white, margin: 0, letterSpacing: "-0.02em" }}>{name}</p>

          {/* Slide-up CTA */}
          <motion.div
            animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 10 }}
            transition={{ duration: 0.22, ease }}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              fontSize: 12, fontWeight: 600, color: C.accent, marginTop: 5,
            }}
          >
            Find coaches &amp; games <ArrowRight size={12} />
          </motion.div>
        </div>

        {/* Accent border on hover */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0 }}
          style={{
            position: "absolute", inset: 0, borderRadius: 14,
            border: `2px solid ${C.accent}`, pointerEvents: "none",
          }}
        />
      </motion.div>
    </Link>
  );
}

function SportsGrid() {
  return (
    <section style={{ background: C.bg, padding: "96px 24px", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Reveal>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 44, flexWrap: "wrap", gap: 16 }}>
            <div>
              <Eyebrow>Sports in Kozhikode</Eyebrow>
              <h2 style={{
                fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800,
                color: C.head, letterSpacing: "-0.035em", lineHeight: 1.1, margin: 0,
              }}>
                What do you play?
              </h2>
            </div>
            <Link href="/learn" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: C.accent, textDecoration: "none" }}>
              View all sports <ArrowRight size={15} />
            </Link>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {SPORTS.map(({ name, img }, i) => (
            <Reveal key={name} delay={i * 0.07}>
              <SportCard name={name} img={img} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   How it works — interactive tabs
───────────────────────────────────── */
const STEPS = [
  {
    n:     "01",
    title: "Create your profile",
    desc:  "Sign up in under a minute. Tell us what sports you play, your skill level, and what you're looking for — coaching, games, or both.",
    img:   "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=640&q=80",
  },
  {
    n:     "02",
    title: "Discover near you",
    desc:  "Browse verified coaches, live pickup games, summer camps, and upcoming tournaments — all filtered to what's near you in Kozhikode.",
    img:   "https://images.unsplash.com/photo-1526676037777-05a232554f77?w=640&q=80",
  },
  {
    n:     "03",
    title: "Book, join and play",
    desc:  "Book a coaching session, join a game, or register for a tournament. Everything happens on the platform — no phone calls, no WhatsApp chaos.",
    img:   "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=640&q=80",
  },
];

function HowItWorks() {
  const [active, setActive] = useState(0);

  // Auto-advance every 4s
  useEffect(() => {
    const t = setInterval(() => setActive(i => (i + 1) % STEPS.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <section style={{ background: C.white, padding: "96px 24px", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <Eyebrow>How it works</Eyebrow>
            <h2 style={{
              fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 800,
              color: C.head, letterSpacing: "-0.035em", marginBottom: 12, lineHeight: 1.1,
            }}>
              Up and playing in three steps
            </h2>
            <p style={{ fontSize: 17, color: C.body, maxWidth: 440, margin: "0 auto" }}>
              No friction. No gatekeeping. Just sports.
            </p>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>
          {/* Step selectors */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {STEPS.map(({ n, title, desc }, i) => (
              <motion.button
                key={n}
                onClick={() => setActive(i)}
                whileHover={{ x: active === i ? 0 : 4 }}
                style={{
                  textAlign: "left", padding: "22px 24px", borderRadius: 14,
                  cursor: "pointer", border: "none", fontFamily: "inherit",
                  background: active === i ? C.accentDim : "transparent",
                  outline: active === i ? `1px solid ${C.accentBorder}` : "1px solid transparent",
                  transition: "background 0.2s, outline 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
                    color: active === i ? C.accent : C.faint,
                    transition: "color 0.2s",
                  }}>
                    {n}
                  </span>
                  <span style={{
                    fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em",
                    color: active === i ? C.head : C.body,
                    transition: "color 0.2s",
                  }}>
                    {title}
                  </span>
                </div>

                {/* Progress bar under active step */}
                {active === i && (
                  <motion.div
                    style={{ height: 2, background: C.border, borderRadius: 99, overflow: "hidden", marginBottom: 8 }}
                  >
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 4, ease: "linear" }}
                      style={{ height: "100%", background: C.accent, borderRadius: 99 }}
                    />
                  </motion.div>
                )}

                <AnimatePresence>
                  {active === i && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ fontSize: 14, color: C.body, lineHeight: 1.65, margin: 0, overflow: "hidden" }}
                    >
                      {desc}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </div>

          {/* Image panel */}
          <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", aspectRatio: "3/2" }}>
            <AnimatePresence mode="wait">
              <motion.img
                key={STEPS[active].img}
                src={STEPS[active].img}
                alt={STEPS[active].title}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.45, ease }}
                style={{
                  position: "absolute", inset: 0,
                  width: "100%", height: "100%", objectFit: "cover",
                }}
              />
            </AnimatePresence>

            {/* Step label overlay */}
            <div style={{
              position: "absolute", bottom: 20, left: 20,
              background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)",
              padding: "8px 16px", borderRadius: 10,
              fontSize: 13, fontWeight: 700, color: C.white,
            }}>
              Step {active + 1} of {STEPS.length}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   Testimonials carousel
───────────────────────────────────── */
const TESTIMONIALS = [
  {
    quote:   "I found my badminton coach through Game Ground in two days. The booking was instant, no WhatsApp back-and-forth. Exactly what was missing in Kozhikode.",
    name:    "Arjun Menon",
    role:    "Badminton player, Calicut",
    rating:  5,
    initial: "A",
    color:   "#dc2626",
  },
  {
    quote:   "As a coach, my entire schedule moved online. Students book directly, I get reminders, and I can see all my sessions in one place. My student count doubled in three months.",
    name:    "Priya Nair",
    role:    "Certified Fitness Coach",
    rating:  5,
    initial: "P",
    color:   "#1d4ed8",
  },
  {
    quote:   "I play cricket every weekend now. Game Ground shows me games near my neighbourhood — I just joined, showed up, and made friends who love the sport as much as I do.",
    name:    "Rahul K.",
    role:    "Cricket enthusiast, Kozhikode",
    rating:  5,
    initial: "R",
    color:   "#16a34a",
  },
];

function Testimonials() {
  const [idx, setIdx] = useState(0);

  const prev = useCallback(() => setIdx(i => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length), []);
  const next = useCallback(() => setIdx(i => (i + 1) % TESTIMONIALS.length), []);

  // Auto-advance
  useEffect(() => {
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [next]);

  const t = TESTIMONIALS[idx];

  return (
    <section style={{ background: C.bg, padding: "96px 24px", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <Eyebrow>Community voices</Eyebrow>
            <h2 style={{
              fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800,
              color: C.head, letterSpacing: "-0.035em", margin: 0, lineHeight: 1.1,
            }}>
              People who play on Game Ground
            </h2>
          </div>
        </Reveal>

        {/* Card */}
        <div style={{ position: "relative" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35, ease }}
              style={{
                background: C.white, border: `1px solid ${C.border}`,
                borderRadius: 20, padding: "40px 48px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                textAlign: "center",
              }}
            >
              {/* Stars */}
              <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 24 }}>
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} size={16} fill="#eab308" color="#eab308" />
                ))}
              </div>

              <p style={{ fontSize: 18, lineHeight: 1.75, color: C.body, fontStyle: "italic", marginBottom: 32 }}>
                &ldquo;{t.quote}&rdquo;
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "center" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%", background: t.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 17, fontWeight: 800, color: C.white, flexShrink: 0,
                }}>
                  {t.initial}
                </div>
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: C.head, margin: 0 }}>{t.name}</p>
                  <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>{t.role}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 28 }}>
          <motion.button
            onClick={prev}
            whileHover={{ scale: 1.08, background: C.white, borderColor: C.accent }}
            whileTap={{ scale: 0.95 }}
            style={{
              width: 40, height: 40, borderRadius: "50%",
              background: C.bgAlt, border: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={16} color={C.body} />
          </motion.button>

          {/* Dots */}
          <div style={{ display: "flex", gap: 8 }}>
            {TESTIMONIALS.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => setIdx(i)}
                animate={{
                  width: i === idx ? 24 : 8,
                  background: i === idx ? C.accent : C.border,
                }}
                transition={{ duration: 0.25 }}
                style={{
                  height: 8, borderRadius: 99, border: "none",
                  cursor: "pointer", padding: 0,
                }}
              />
            ))}
          </div>

          <motion.button
            onClick={next}
            whileHover={{ scale: 1.08, background: C.white, borderColor: C.accent }}
            whileTap={{ scale: 0.95 }}
            style={{
              width: 40, height: 40, borderRadius: "50%",
              background: C.bgAlt, border: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ChevronRight size={16} color={C.body} />
          </motion.button>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   CTA block
───────────────────────────────────── */
function CTABlock() {
  return (
    <section style={{ background: C.dark, padding: "96px 24px", position: "relative", overflow: "hidden" }}>
      {/* Subtle animated orbs */}
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", top: -80, left: -80,
          width: 320, height: 320, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(220,38,38,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <motion.div
        animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        style={{
          position: "absolute", bottom: -60, right: -60,
          width: 280, height: 280, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(220,38,38,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
        <Reveal>
          <span style={{
            display: "inline-block", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.4)", marginBottom: 20,
          }}>
            Ready to start?
          </span>
          <h2 style={{
            fontSize: "clamp(30px, 4.5vw, 56px)", fontWeight: 900,
            color: C.white, letterSpacing: "-0.04em", lineHeight: 1.08, marginBottom: 18,
          }}>
            Kozhikode&apos;s sports community is waiting for you.
          </h2>
          <p style={{
            fontSize: 18, color: "rgba(255,255,255,0.5)", lineHeight: 1.7,
            maxWidth: 460, margin: "0 auto 40px",
          }}>
            Create a free account and find a game, a coach, or a team near you — today.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register" style={{ textDecoration: "none" }}>
              <motion.div
                whileHover={{ scale: 1.04, boxShadow: "0 8px 28px rgba(220,38,38,0.5)" }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "15px 32px", borderRadius: 10, fontSize: 15, fontWeight: 700,
                  background: C.accent, color: C.white,
                  boxShadow: "0 4px 16px rgba(220,38,38,0.35)",
                }}
              >
                Create free account <ArrowRight size={16} />
              </motion.div>
            </Link>
            <Link href="/play" style={{ textDecoration: "none" }}>
              <motion.div
                whileHover={{ scale: 1.03, borderColor: "rgba(255,255,255,0.3)", color: C.white }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "15px 32px", borderRadius: 10, fontSize: 15, fontWeight: 600,
                  color: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  transition: "color 0.2s, border-color 0.2s",
                }}
              >
                Browse games first
              </motion.div>
            </Link>
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", marginTop: 24 }}>
            Free to join. No credit card required.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   Footer
───────────────────────────────────── */
const FOOTER_LINKS = {
  Platform:  [
    { href: "/learn",  label: "Find a Coach" },
    { href: "/play",   label: "Join a Game"  },
    { href: "/camps",  label: "Summer Camps" },
    { href: "/events", label: "Tournaments"  },
    { href: "/search", label: "Search"       },
  ],
  Community: [
    { href: "/register",       label: "Create Account" },
    { href: "/login",          label: "Sign In"         },
    { href: "/register/coach", label: "Become a Coach" },
    { href: "/about",          label: "About Us"        },
  ],
  Legal: [
    { href: "/terms",   label: "Terms of Use"   },
    { href: "/privacy", label: "Privacy Policy" },
  ],
};

function Footer() {
  return (
    <footer style={{ background: C.bg, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "56px 24px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
          {/* Brand */}
          <div>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <span style={{ fontWeight: 800, fontSize: 14, color: C.head, letterSpacing: "-0.03em" }}>Game Ground</span>
            </Link>
            <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65, maxWidth: 260, marginBottom: 20 }}>
              Kozhikode&apos;s platform for sports coaches, pickup games, camps and tournaments.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {[{ label: "IG", href: "#" }, { label: "𝕏", href: "#" }, { label: "YT", href: "#" }].map(({ label, href }, i) => (
                <motion.a
                  key={i} href={href}
                  whileHover={{ scale: 1.1, background: C.accent, color: C.white, borderColor: C.accent }}
                  style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: C.bgAlt, border: `1px solid ${C.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: C.muted, textDecoration: "none",
                    fontSize: 11, fontWeight: 700,
                    transition: "color 0.2s, background 0.2s, border-color 0.2s",
                  }}
                >
                  {label}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([col, links]) => (
            <div key={col}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.head, marginBottom: 16 }}>
                {col}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {links.map(({ href, label }) => (
                  <Link key={href} href={href} style={{ fontSize: 14, color: C.muted, textDecoration: "none" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = C.body}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = C.muted}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Divider />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, paddingTop: 24 }}>
          <p style={{ fontSize: 13, color: C.faint }}>© 2026 Game Ground. Kozhikode, Kerala, India.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.faint }}>
            <MapPin size={13} /> Made in Kozhikode
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────
   Page
───────────────────────────────────── */
export default function Home() {
  return (
    <div style={{ background: C.white, color: C.head, minHeight: "100vh" }}>
      <ScrollProgress />
      <LandingNav />
      <Hero />
      <StatsBar />
      <Offerings />
      <SportsGrid />
      <HowItWorks />
      <Testimonials />
      <CTABlock />
      <Footer />
    </div>
  );
}
