"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const MARQUEE_ITEMS = [
  "Built for Kozhikode",
  "Verified coaches",
  "Games every week",
  "All kinds of sports",
  "Beachside to indoor courts",
  "Trusted by local players",
];

export function Marquee() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trackRef.current) return;
    
    const trackWidth = trackRef.current.scrollWidth / 3;
    
    const tl = gsap.to(trackRef.current, {
      x: -trackWidth,
      duration: 20,
      ease: "none",
      repeat: -1,
      modifiers: {
        x: gsap.utils.unitize((x) => parseFloat(x) % trackWidth)
      }
    });

    // Speed up based on scroll velocity
    ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const velocity = Math.abs(self.getVelocity());
        const speedMultiplier = 1 + velocity / 500; // clamp or scale
        gsap.to(tl, { timeScale: speedMultiplier, duration: 0.1, overwrite: "auto" });
        // gradually slow back down
        gsap.to(tl, { timeScale: 1, duration: 1, delay: 0.2, overwrite: "auto", ease: "power2.out" });
      }
    });

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  // Duplicate items 3 times
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <div style={{
      position: "relative",
      padding: "80px 0",
      background: "#050505",
      borderTop: "1px solid rgba(255,255,255,0.05)",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
    }}>
      {/* Dark gradient fades on edges */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: "15vw",
        background: "linear-gradient(90deg, #050505 0%, transparent 100%)", zIndex: 2, pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: "15vw",
        background: "linear-gradient(270deg, #050505 0%, transparent 100%)", zIndex: 2, pointerEvents: "none"
      }} />

      <div ref={trackRef} style={{ display: "flex", gap: "64px", width: "max-content", willChange: "transform" }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "64px", flexShrink: 0 }}>
            <span 
              className="display"
              style={{
                fontFamily: "var(--font-sans)", // Using sans instead of serif for bold editorial look
                fontSize: "clamp(48px, 6vw, 84px)",
                fontWeight: 900,
                color: "transparent",
                WebkitTextStroke: "1px rgba(255,255,255,0.4)", // Outline text (Awwwards style)
                whiteSpace: "nowrap",
                letterSpacing: "-0.02em"
              }}
            >
              {item}
            </span>
            <span style={{ color: "#ffffff", fontSize: "24px", opacity: 0.2 }}>✦</span>
          </div>
        ))}
      </div>
    </div>
  );
}
