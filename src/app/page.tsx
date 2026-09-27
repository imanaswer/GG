"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { ArrowUpRight, ArrowRight, ArrowDown, MapPin } from "lucide-react";

import { EdgeNav } from "@/components/premium/EdgeNav";
import { PremiumNav } from "@/components/premium/PremiumNav";
import { ImmersiveHero } from "@/components/premium/ImmersiveHero";
import { EntryScrollytelling } from "@/components/premium/EntryScrollytelling";
import { CinematicDirectory } from "@/components/premium/CinematicDirectory";
import { SmoothScroll } from "@/components/premium/SmoothScroll";
import { Preloader } from "@/components/premium/Preloader";
import { Magnetic } from "@/components/premium/Magnetic";
import { SplitText } from "@/components/premium/SplitText";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { TrueFocusList } from "@/components/premium/TrueFocusList";
import { STORY } from "@/lib/premium-images";

/* ──────────────────────────────────────────────────────── */

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40 });
  return (
    <motion.div
      style={{
        position: "fixed", top: 0, left: 0, right: 0,
        height: 2, background: "linear-gradient(90deg, #F5F5F3, #DCDDDA)",
        transformOrigin: "0%", scaleX, zIndex: 200,
      }}
    />
  );
}

/* Avant Hero and Hub injected below */

/* ── Closing conversion section (Immersive + Stats + CTA merged) ── */

function Counter({ from = 0, to, suffix = "" }: { from?: number; to: number; suffix?: string }) {
  const [val, setVal] = useState(from);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    if (typeof IntersectionObserver === "undefined") {
      raf = requestAnimationFrame(() => setVal(to));
      return () => cancelAnimationFrame(raf);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let started = false;
    const animate = () => {
      const duration = 1600;
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        setVal(Math.round(from + (to - from) * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !started) {
        started = true;
        if (reduce) setVal(to); else animate();
        io.disconnect();
      }
    }, { threshold: 0.4 });
    io.observe(el);

    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [from, to]);

  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

const CLOSE_STATS = [
  { value: 147, suffix: "+", label: "Players onboard" },
  { value: 12, suffix: "", label: "Founding coaches" },
  { value: 7, suffix: "", label: "Sports live" },
  { value: 1, suffix: "", label: "City — more coming" },
];

function ConversionClose() {
  const containerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
      import("gsap").then(({ default: gsap }) => {
        gsap.registerPlugin(ScrollTrigger);
        if (!containerRef.current || !contentRef.current) return;
        
        // Background subtle parallax
        gsap.fromTo(bgRef.current,
          { yPercent: -20 },
          {
            yPercent: 20,
            ease: "none",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            }
          }
        );

        // Stagger the children
        const elements = contentRef.current.querySelectorAll(".awwwards-reveal");
        gsap.fromTo(elements,
          { y: 80, opacity: 0 },
          {
            y: 0, opacity: 1,
            duration: 1.4,
            stagger: 0.15,
            ease: "power4.out",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 75%",
            }
          }
        );
      });
    });
  }, []);

  return (
    <section ref={containerRef} style={{ position: "relative", overflow: "hidden", background: "#000000" }}>
      <div style={{ position: "absolute", inset: "-15% 0", zIndex: -1 }}>
        <img
          ref={bgRef}
          src={STORY.connect.src}
          alt={STORY.connect.alt}
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%) opacity(0.35)" }}
        />
      </div>
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: "linear-gradient(180deg, #000000 0%, rgba(0,0,0,0.6) 30%, #000000 100%)",
      }} />

      <div ref={contentRef} className="conversion-content" style={{ position: "relative", zIndex: 10 }}>
        <div className="container-lg" style={{ textAlign: "center" }}>
          
          <div className="awwwards-reveal">
            <span className="eyebrow" style={{ 
              color: "#747574", display: "block", marginBottom: 40, 
              letterSpacing: "0.25em", fontSize: "12px", textTransform: "uppercase" 
            }}>
              Camps · Tournaments · Community
            </span>
          </div>

          <div className="awwwards-reveal">
            <h2 className="display" style={{
              fontSize: "clamp(56px, 12vw, 160px)",
              color: "#fff",
              maxWidth: 1400, margin: "0 auto 48px",
              lineHeight: 0.9,
              letterSpacing: "-0.03em"
            }}>
              <SplitText text="Your next match" as="div" delay={0.2} scrollTrigger={true} />
              <div style={{ marginTop: "12px" }}>
                <SplitText text="starts here." className="display-serif" as="span" style={{ color: "#DCDDDA", fontStyle: "italic", fontWeight: 300, display: "inline-block" }} delay={0.4} scrollTrigger={true} />
              </div>
            </h2>
          </div>

          <div className="awwwards-reveal">
            <ScrollReveal 
              baseOpacity={0}
              enableBlur={true}
              blurStrength={5}
              staggerDelay={0.02}
              textClassName="paragraph-reveal"
            >
              Train with verified coaches, drop into pickup games, and show up for the tournaments your city actually plays. One app, one move.
            </ScrollReveal>
            <style>{`
              .paragraph-reveal {
                font-size: clamp(18px, 2vw, 24px);
                color: #A0A0A0;
                max-width: 680px;
                margin: 0 auto 100px;
                line-height: 1.5;
                font-weight: 400;
              }
            `}</style>
          </div>

          <div className="close-stats awwwards-reveal">
            {CLOSE_STATS.map(s => (
              <div key={s.label} className="close-stat" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{
                  fontFamily: "var(--font-sans)", fontWeight: 900,
                  fontSize: "clamp(48px, 6vw, 84px)",
                  color: "#fff", letterSpacing: "-0.05em", lineHeight: 1
                }}>
                  <Counter to={s.value} suffix={s.suffix} />
                </div>
                <div style={{ fontSize: 13, color: "#747574", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <div className="awwwards-reveal conversion-btn-wrapper">
            <Magnetic strength={40}>
              <Link href="/register" className="conversion-btn conversion-btn-primary"
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                Create free account <ArrowUpRight size={20} />
              </Link>
            </Magnetic>
            <Magnetic strength={30}>
              <Link href="/play" className="conversion-btn conversion-btn-secondary"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.transform = "scale(1)";
              }}
              >
                Browse games <ArrowRight size={20} />
              </Link>
            </Magnetic>
          </div>
          <style>{`
            .conversion-content {
              padding: 240px 0 200px;
            }
            .close-stats {
              display: flex;
              flex-wrap: wrap;
              justify-content: center;
              gap: 6vw;
              margin-bottom: 120px;
            }
            .conversion-btn-wrapper {
              display: flex;
              gap: 24px;
              justify-content: center;
              flex-wrap: wrap;
            }
            .conversion-btn {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 12px;
              padding: 24px 48px;
              border-radius: 100px;
              font-size: 16px;
              text-decoration: none;
              transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), background 0.4s ease;
            }
            .conversion-btn-primary {
              background: #F5F5F3;
              color: #000;
              font-weight: 700;
            }
            .conversion-btn-secondary {
              background: rgba(255,255,255,0.03);
              border: 1px solid rgba(255,255,255,0.1);
              color: #fff;
              font-weight: 600;
              backdrop-filter: blur(10px);
            }

            @media (max-width: 768px) {
              .conversion-content {
                padding: 120px 0 20px;
              }
              .close-stats {
                margin-bottom: 48px;
              }
              .conversion-btn-wrapper {
                flex-direction: column;
                gap: 12px;
                padding: 0 24px;
                align-items: stretch;
              }
              .conversion-btn-wrapper > div {
                display: block !important;
                width: 100%;
              }
              .conversion-btn {
                padding: 16px 24px;
                font-size: 15px;
                width: 100%;
              }
            }
          `}</style>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ─────────────────────────────────────────────── */

function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
      import("gsap").then(({ default: gsap }) => {
        gsap.registerPlugin(ScrollTrigger);
        if (!footerRef.current || !contentRef.current) return;

        // Parallax curtain reveal for the footer content (desktop only)
        const isMobile = window.matchMedia("(max-width: 768px)").matches;
        
        if (!isMobile) {
          gsap.fromTo(contentRef.current,
            { yPercent: -40, scale: 0.95 },
            {
              yPercent: 0,
              scale: 1,
              ease: "none",
              scrollTrigger: {
                trigger: footerRef.current,
                start: "top bottom",
                end: "top 20%",
                scrub: true,
              }
            }
          );
        }
      });
    });
  }, []);

  return (
    <footer ref={footerRef} className="footer-section">
      <div ref={contentRef} className="container-lg">
        {/* Huge typographic CTA in footer */}
        <div className="footer-cta-wrapper">
            <Magnetic strength={15}>
              <TrueFocusList 
                items={[
                  { text: "LEARN.", defaultColor: "#333333", x: "-3vw" },
                  { text: "PLAY.", defaultColor: "#747574", x: "1vw" },
                  { text: "CONNECT.", defaultColor: "#FFFFFF", x: "3vw" }
                ]}
                className="display"
                style={{ 
                  fontSize: "clamp(48px, 12vw, 180px)", 
                  lineHeight: 0.85, 
                  letterSpacing: "-0.04em",
                  margin: 0,
                  textAlign: "center"
                }}
              />
            </Magnetic>
        </div>

        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", marginBottom: 32, textDecoration: "none" }}>
              <img src="/logo2.png" alt="Game Ground" style={{ height: 48, width: "auto", display: "block", filter: "brightness(0) invert(1)" }} />
            </Link>
            <p className="footer-desc" style={{ fontSize: 16, color: "#747574", maxWidth: 320, lineHeight: 1.6 }}>
              Kozhikode&apos;s hyperlocal sports platform. Learn. Play. Connect.
            </p>
            <div className="footer-built-in" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 32, fontSize: 14, color: "#DCDDDA", fontWeight: 600 }}>
              <MapPin size={16} />
              <span>Built in Kozhikode, Kerala</span>
            </div>
          </div>

          <div className="footer-links-container">
            {[
              { title: "Discover", links: [["Coaches", "/learn"], ["Games", "/play"], ["Camps", "/camps"], ["Events", "/events"]] },
              { title: "Company", links: [["About", "/about"], ["Search", "/search"]] },
              { title: "Legal", links: [["Privacy", "/privacy"], ["Terms", "/terms"], ["Coach Conditions", "/coach-conditions"]] },
            ].map(col => (
              <div key={col.title}>
                <div className="footer-eyebrow" style={{ marginBottom: 32, color: "#747574", letterSpacing: "0.2em", fontSize: 12, textTransform: "uppercase" }}>
                  {col.title}
                </div>
                <div className="footer-links-group" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {col.links.map(([label, href]) => (
                    <Link key={href} href={href} className="footer-link" style={{
                      fontSize: 16, color: "#DCDDDA", fontWeight: 500,
                      textDecoration: "none", display: "flex", alignItems: "center", gap: 8,
                      transition: "color 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
                    }}>
                      <span className="footer-link-arrow" style={{ opacity: 0, transform: "translateX(-10px)", transition: "all 0.3s ease", fontSize: 18 }}>→</span>
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20,
          flexWrap: "wrap", fontSize: 14, color: "#747574", fontWeight: 500,
          borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 32
        }}>
          <span>© {new Date().getFullYear()} Game Ground. All rights reserved.</span>
        </div>
      </div>
      <style>{`
        .footer-section {
          background: #000000;
          padding: 160px 0 48px;
          overflow: hidden;
          position: relative;
        }
        .footer-cta-wrapper {
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding-bottom: 100px;
          margin-bottom: 80px;
          display: flex;
          justify-content: center;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 64px;
          margin-bottom: 80px;
        }
        .footer-links-container {
          display: contents;
        }
        .footer-links-group:hover .footer-link {
          color: #4A4A4A !important;
        }
        .footer-links-group .footer-link:hover {
          color: #FFFFFF !important;
          transform: translateX(4px);
        }
        .footer-links-group .footer-link:hover .footer-link-arrow {
          opacity: 1 !important;
          transform: translateX(0) !important;
        }

        @media (max-width: 768px) {
          .footer-section {
            padding: 40px 0 48px;
          }
          .footer-cta-wrapper {
            padding-bottom: 32px;
            margin-bottom: 40px;
          }
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 40px;
            margin-bottom: 40px;
          }
          .footer-links-container {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px 8px;
          }
          .footer-brand img {
            height: 40px !important;
          }
          .footer-desc {
            font-size: 14px !important;
          }
          .footer-built-in {
            margin-top: 24px !important;
            font-size: 13px !important;
          }
          .footer-eyebrow {
            margin-bottom: 20px !important;
            font-size: 10px !important;
          }
          .footer-link {
            font-size: 13px !important;
          }
          .footer-links-group {
            gap: 16px !important;
          }
          .footer-link-arrow {
            display: none !important;
          }
        }
      `}</style>
    </footer>
  );
}

/* ── Page ───────────────────────────────────────────────── */

export default function LandingPage() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    if (loaded) {
      if (typeof window !== "undefined") {
        const lenis = window.__lenis;
        if (lenis) {
          lenis.scrollTo(0, { immediate: true });
        } else {
          window.scrollTo(0, 0);
        }
        
        if (window.ScrollTrigger) {
          window.ScrollTrigger.refresh();
        }
      }
    }
  }, [loaded]);

  return (
    <>
      {!loaded && <Preloader onComplete={() => setLoaded(true)} />}
      
      {loaded && (
        <>
          <SmoothScroll />
          <ScrollProgress />
        </>
      )}
      
      <EdgeNav />
      <PremiumNav variant="transparent" />

      <main style={{ background: "#000000", color: "#fff", position: "relative" }}>
        {loaded && <ImmersiveHero />}
        {loaded && <CinematicDirectory />}
        {loaded && <EntryScrollytelling />}
        {loaded && <ConversionClose />}
        {loaded && <Footer />}
      </main>
    </>
  );
}
