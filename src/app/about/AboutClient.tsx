"use client";
import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import SplitType from "split-type";
import { PremiumNav } from "@/components/premium/PremiumNav";
import { SmoothScroll } from "@/components/premium/SmoothScroll";
import { CustomCursor } from "@/components/premium/CustomCursor";
import { HERO_BACKDROPS, STORY } from "@/lib/premium-images";
import { ArrowRight, MapPin, Users } from "lucide-react";

/* lucide-react doesn't ship brand logos — inline SVG for LinkedIn */
const Linkedin = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

gsap.registerPlugin(ScrollTrigger);

export function AboutClient({ initialStats = { players: 500, coaches: 50, games: 200, sports: 15 } }) {
  const container = useRef<HTMLDivElement>(null);

  return (
    <div ref={container} style={{ background: "#050505", color: "#fff", minHeight: "100vh" }}>
      <CustomCursor />
      <PremiumNav variant="transparent" />
      <SmoothScroll />

      <HeroSection />
      <StatsSection stats={initialStats} />
      <PhilosophySection />
      <QuoteSection />
      <ImageFilmstripSection />
      <ValuesSection />
      <SayHelloSection />
    </div>
  );
}

function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);
  const text1Ref = useRef<HTMLHeadingElement>(null);
  const text2Ref = useRef<HTMLHeadingElement>(null);
  const text3Ref = useRef<HTMLHeadingElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!heroRef.current || !text1Ref.current || !text2Ref.current || !text3Ref.current || !imageRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
          pin: true,
        }
      });

      tl.to(text1Ref.current, { x: "-50vw", opacity: 0, rotateZ: -10, scale: 0.5 }, 0)
        .to(text2Ref.current, { x: "50vw", opacity: 0, rotateZ: 10, scale: 0.5 }, 0)
        .to(text3Ref.current, { y: "-50vh", opacity: 0, scale: 2 }, 0)
        .to(imageRef.current, { scale: 1.2, opacity: 1, filter: "grayscale(0%) contrast(1.1)", duration: 1 }, 0);
    });

    return () => ctx.revert();
  }, []);

  return (
    <section ref={heroRef} style={{ height: "100vh", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      
      {/* Background Image that scales up */}
      <div ref={imageRef} style={{ position: "absolute", inset: "-10%", zIndex: 0, opacity: 0.2, filter: "grayscale(100%) blur(4px)", scale: 0.8, transition: "transform 0.1s" }}>
        <Image src={HERO_BACKDROPS[0].src} alt="Hero" fill priority sizes="100vw" style={{ objectFit: "cover" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", pointerEvents: "none", mixBlendMode: "difference" }}>
        <h1 ref={text1Ref} style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(60px, 12vw, 200px)", lineHeight: 0.8, margin: 0, textTransform: "uppercase", whiteSpace: "nowrap" }}>
          REWRITING
        </h1>
        <h1 ref={text2Ref} style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(60px, 12vw, 200px)", lineHeight: 0.8, margin: 0, textTransform: "uppercase", whiteSpace: "nowrap", marginLeft: "10vw" }}>
          THE RULES
        </h1>
        <h1 ref={text3Ref} style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(40px, 8vw, 150px)", lineHeight: 0.8, margin: 0, textTransform: "uppercase", color: "transparent", WebkitTextStroke: "2px rgba(255,255,255,0.8)", marginTop: "2vw" }}>
          OF PLAY
        </h1>
      </div>
    </section>
  );
}

function PhilosophySection() {
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!textRef.current) return;
    const split = new SplitType(textRef.current, { types: "words" });

    const ctx = gsap.context(() => {
      gsap.fromTo(split.words, 
        { opacity: 0, y: 50, rotateX: -90 },
        {
          opacity: 1, y: 0, rotateX: 0,
          stagger: 0.05,
          ease: "back.out(1.7)",
          scrollTrigger: {
            trigger: textRef.current,
            start: "top 80%",
            end: "bottom 40%",
            scrub: 1
          }
        }
      );
    });

    return () => {
      ctx.revert();
      split.revert();
    };
  }, []);

  return (
    <section style={{ padding: "20vh 4vw", background: "#F5F5F3", color: "#050505", minHeight: "100vh", display: "flex", alignItems: "center" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.2em", marginBottom: 60, textTransform: "uppercase" }}>
          (01) The Philosophy
        </div>
        <div ref={textRef} style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(32px, 5vw, 80px)", lineHeight: 1.1, fontWeight: 400, textTransform: "uppercase", maxWidth: 1200 }}>
          We are not digitising sports. We are removing the friction of showing up. Finding a game shouldn&apos;t be a chore. It should be an instinct.
        </div>
      </div>
    </section>
  );
}

function ImageFilmstripSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current || !trackRef.current) return;

    const ctx = gsap.context(() => {
      const scrollWidth = trackRef.current!.scrollWidth - window.innerWidth;
      
      gsap.to(trackRef.current, {
        x: -scrollWidth,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: () => "+=" + (scrollWidth * 0.4),
          scrub: 0.1,
          pin: true,
        }
      });
    });

    return () => ctx.revert();
  }, []);

  const images = [
    STORY.connect.src, STORY.play.src, STORY.learn.src, 
    HERO_BACKDROPS[1].src, HERO_BACKDROPS[0].src
  ];

  return (
    <section ref={sectionRef} style={{ height: "100vh", background: "#050505", overflow: "hidden", display: "flex", alignItems: "center", position: "relative" }}>
      {/* Background massive noise/texture */}
      <div style={{ position: "absolute", top: -100, bottom: -100, left: 0, right: 0, background: "url(/noise.png)", opacity: 0.05, pointerEvents: "none" }} />
      
      <div style={{ position: "absolute", top: "10%", left: "4vw", fontSize: 14, color: "#DCDDDA", letterSpacing: "0.2em", zIndex: 10 }}>(02) THE MOMENTS</div>

      <div 
        ref={trackRef} 
        style={{ 
          display: "flex", 
          gap: "8vw", 
          padding: "0 10vw", 
          width: "max-content",
          transform: "rotate(-5deg)", // Skewed perspective
          transformOrigin: "center center"
        }}
      >
        {images.map((src, i) => (
          <div key={i} style={{ position: "relative", width: "50vw", height: "60vh", borderRadius: 24, overflow: "hidden", flexShrink: 0, border: "1px solid rgba(255,255,255,0.1)" }}>
            <Image src={src} alt="Gallery" fill sizes="(max-width: 768px) 100vw, 33vw" style={{ objectFit: "cover", filter: "grayscale(30%)" }} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ValuesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  
  // 3D Stacking Cards Effect
  return (
    <section ref={sectionRef} style={{ padding: "20vh 4vw", background: "#050505", position: "relative" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
        
        {/* Sticky Card 1 */}
        <div className="sticky-card" style={{ position: "sticky", top: "10vh", height: "80vh", background: "#111", borderRadius: 32, padding: "6vw", border: "1px solid rgba(255,255,255,0.05)", marginBottom: "10vh", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ fontSize: 120, fontFamily: "var(--font-serif)", color: "transparent", WebkitTextStroke: "1px rgba(255,255,255,0.2)" }}>01</div>
          <div>
            <h2 style={{ fontSize: "clamp(40px, 6vw, 80px)", margin: "0 0 20px 0", fontFamily: "var(--font-serif)", textTransform: "uppercase" }}>Trust By Default</h2>
            <p style={{ fontSize: 24, color: "rgba(255,255,255,0.5)", maxWidth: 600 }}>Every coach is verified in person. No ghost profiles, no middlemen.</p>
          </div>
        </div>

        {/* Sticky Card 2 */}
        <div className="sticky-card" style={{ position: "sticky", top: "15vh", height: "80vh", background: "#DCDDDA", color: "#050505", borderRadius: 32, padding: "6vw", marginBottom: "10vh", display: "flex", flexDirection: "column", justifyContent: "space-between", transformOrigin: "top" }}>
          <div style={{ fontSize: 120, fontFamily: "var(--font-serif)", color: "transparent", WebkitTextStroke: "1px rgba(5,5,5,0.2)" }}>02</div>
          <div>
            <h2 style={{ fontSize: "clamp(40px, 6vw, 80px)", margin: "0 0 20px 0", fontFamily: "var(--font-serif)", textTransform: "uppercase" }}>Built for Keralam</h2>
            <p style={{ fontSize: 24, color: "rgba(5,5,5,0.6)", maxWidth: 600 }}>WhatsApp-first, UPI payments, and built for the Malabar culture.</p>
          </div>
        </div>

        {/* Sticky Card 3 */}
        <div className="sticky-card" style={{ position: "sticky", top: "20vh", height: "80vh", background: "#f5f5f5", color: "#050505", borderRadius: 32, padding: "6vw", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ fontSize: 120, fontFamily: "var(--font-serif)", color: "transparent", WebkitTextStroke: "1px rgba(5,5,5,0.2)" }}>03</div>
          <div>
            <h2 style={{ fontSize: "clamp(40px, 6vw, 80px)", margin: "0 0 20px 0", fontFamily: "var(--font-serif)", textTransform: "uppercase" }}>Instant Always</h2>
            <p style={{ fontSize: 24, color: "rgba(5,5,5,0.6)", maxWidth: 600 }}>Tap, join, play. The shortest possible path from wanting to play to actually playing.</p>
          </div>
        </div>

      </div>
    </section>
  );
}


function StatsSection({ stats }: { stats: { players: number, coaches: number, games: number, sports: number } }) {
  const statsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!statsRef.current) return;
    const ctx = gsap.context(() => {
      // Fade and slide up
      gsap.from(".stat-item", {
        scrollTrigger: { trigger: statsRef.current, start: "top 85%" },
        y: 40, opacity: 0, stagger: 0.1, ease: "power3.out", duration: 1
      });

      // Number counter animation
      const statElements = gsap.utils.toArray<HTMLElement>(".stat-val");
      statElements.forEach((el) => {
        const target = parseInt(el.getAttribute("data-target") || "0", 10);
        const obj = { val: 0 };
        gsap.to(obj, {
          val: target,
          duration: 2.5,
          ease: "power3.out",
          scrollTrigger: { trigger: statsRef.current, start: "top 85%" },
          onUpdate: () => {
            el.innerText = Math.floor(obj.val) + "+";
          }
        });
      });
    }, statsRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={statsRef} style={{ padding: "10vh 4vw", background: "#050505" }}>
      <div className="about-stats-grid" style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 40, borderTop: "1px solid rgba(255,255,255,0.1)", borderBottom: "1px solid rgba(255,255,255,0.1)", padding: "40px 0" }}>
        {[
          { label: "Active players", val: stats.players },
          { label: "Verified coaches", val: stats.coaches },
          { label: "Games organised", val: stats.games },
          { label: "Sports supported", val: stats.sports }
        ].map((s, i) => (
          <div key={i} className="stat-item" style={{ textAlign: "center" }}>
            <div className="stat-val about-stat-val" data-target={s.val} style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(40px, 6vw, 64px)", color: "#fff", lineHeight: 1 }}>
              0+
            </div>
            <div className="about-stat-label" style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", marginTop: 12 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuoteSection() {
  return (
    <section style={{ padding: "15vh 4vw", background: "#050505", display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: 1000, position: "relative", textAlign: "center" }}>
        <div style={{ position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)", fontSize: 200, fontFamily: "var(--font-serif)", color: "rgba(255,255,255,0.06)", lineHeight: 1, pointerEvents: "none" }}>“</div>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(32px, 5vw, 60px)", lineHeight: 1.2, color: "#fff", position: "relative", zIndex: 1, marginBottom: 40 }}>
          We&apos;re not trying to digitise sports. We&apos;re trying to get more people off the couch, onto the court, and into a rhythm where showing up is the default — not the friction.
        </h2>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <div style={{ position: "relative", width: 48, height: 48 }}>
            <Image src="/loader-logo.png" alt="Game Ground" fill sizes="48px" style={{ objectFit: "contain" }} />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: 700, color: "#fff" }}>Game Ground Team</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Built in Kozhikode, Kerala</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SayHelloSection() {
  return (
    <section className="about-footer-section" style={{ position: "relative", minHeight: "100vh", background: "#050505", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "10vh 4vw 4vw 4vw", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
      
      {/* Top row of the footer/contact */}
      <div className="footer-top-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 40 }}>
        <div className="footer-contact-text" style={{ maxWidth: 400 }}>
          <div style={{ fontSize: 14, color: "var(--color-alabaster)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 24 }}>( Contact )</div>
          <p style={{ fontSize: 20, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
            Whether you&apos;re a coach, a venue owner, or a player who wants to talk — we&apos;re always listening.
          </p>
        </div>
        
        <div className="footer-links-grid" style={{ display: "flex", gap: "4vw" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Socials</div>
            <a href="#" className="footer-link">Instagram</a>
            <a href="#" className="footer-link">Twitter</a>
            <a href="https://www.linkedin.com/company/game-ground/posts/?feedView=all" target="_blank" rel="noopener noreferrer" className="footer-link">LinkedIn</a>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Legal</div>
            <a href="/privacy" className="footer-link">Privacy Policy</a>
            <a href="/terms" className="footer-link">Terms of Service</a>
          </div>
        </div>
      </div>

      {/* Massive Typography Middle */}
      <div className="footer-middle" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "10vh 0" }}>
        <h1 
          className="footer-huge-text"
          data-cursor-ignore="true"
          style={{ 
            fontFamily: "var(--font-serif)", 
            fontSize: "clamp(40px, 10vw, 180px)", 
            lineHeight: 0.9, 
            margin: 0, 
            color: "var(--color-smoke)",
            textTransform: "uppercase",
            letterSpacing: "-0.02em",
            textAlign: "center",
            display: "flex",
            gap: "2vw",
            flexWrap: "wrap",
            justifyContent: "center"
          }}
        >
          <span>Learn.</span> <span>Play.</span> <span>Connect.</span>
        </h1>
      </div>

      {/* Premium Buttons */}
      <div className="footer-links" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 48, paddingBottom: "10vh" }}>
        
        <a href="mailto:hello@gameground.net" className="minimal-link" data-cursor-ignore="true">
          hello@gameground.net <span className="minimal-arrow"><ArrowRight size={20} /></span>
        </a>

        <a href="https://wa.me/919876543210" className="minimal-link" data-cursor-ignore="true">
          WhatsApp us directly <span className="minimal-arrow"><Users size={20} /></span>
        </a>

        <a href="https://www.linkedin.com/company/game-ground/posts/?feedView=all" target="_blank" rel="noopener noreferrer" className="minimal-link" data-cursor-ignore="true">
          LinkedIn <span className="minimal-arrow"><Linkedin size={20} /></span>
        </a>

      </div>

      {/* Bottom info */}
      <div className="footer-bottom" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
        <div>© 2026 Game Ground.<br/>Built in Kozhikode, Kerala.</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-smoke)" }} />
          All systems operational
        </div>
      </div>

      <style>{`
        .footer-link {
          color: var(--color-smoke);
          text-decoration: none;
          font-size: 16px;
          transition: opacity 0.3s ease;
        }
        .footer-link:hover {
          opacity: 0.5;
        }
        .minimal-link {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 20px;
          font-weight: 500;
          color: var(--color-smoke);
          text-decoration: none;
          position: relative;
          padding-bottom: 8px;
        }
        .minimal-link::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 1px;
          background: var(--color-smoke);
          transform: scaleX(0);
          transform-origin: right;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .minimal-link:hover::after {
          transform: scaleX(1);
          transform-origin: left;
        }
        .minimal-arrow {
          display: flex;
          align-items: center;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .minimal-link:hover .minimal-arrow {
          transform: translateX(6px);
        }
        
        @media (max-width: 768px) {
          .about-footer-section {
            padding-top: 8vh !important;
            padding-bottom: 6vh !important;
            min-height: auto !important;
          }
          .footer-top-row {
            flex-direction: column !important;
            gap: 48px !important;
          }
          .footer-contact-text p {
            font-size: 18px !important;
          }
          .footer-links-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            width: 100% !important;
            gap: 24px !important;
          }
          .footer-middle {
            padding: 10vh 0 !important;
            justify-content: flex-start !important;
            align-items: flex-start !important;
          }
          .footer-huge-text {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0 !important;
            font-size: 64px !important;
          }
          .footer-links {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0 !important;
            padding-bottom: 8vh !important;
            width: 100% !important;
          }
          .minimal-link {
            width: 100% !important;
            padding: 24px 0 !important;
            border-bottom: 1px solid rgba(255,255,255,0.1) !important;
            justify-content: space-between !important;
            font-size: 18px !important;
          }
          .minimal-link:first-child {
            border-top: 1px solid rgba(255,255,255,0.1) !important;
          }
          .minimal-link::after {
            display: none !important;
          }
          .footer-bottom {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 24px !important;
            font-size: 13px !important;
          }
          .about-stats-grid {
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 12px !important;
            padding: 24px 0 !important;
          }
          .about-stat-val {
            font-size: 24px !important;
          }
          .about-stat-label {
            font-size: 8px !important;
            letter-spacing: 0.05em !important;
            margin-top: 8px !important;
          }
        }
      `}</style>
    </section>
  );
}
