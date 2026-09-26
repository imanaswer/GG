"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { LiquidImage } from "@/components/premium/LiquidImage";

export function AvantHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!textRef.current || !containerRef.current) return;
    
    const chars = gsap.utils.toArray<HTMLElement>(".hero-char");
    
    // Kinetic text reveal
    gsap.fromTo(chars,
      { y: 150, opacity: 0, scale: 1.5, rotationX: -90 },
      { 
        y: 0, opacity: 1, scale: 1, rotationX: 0, 
        duration: 2, 
        stagger: 0.05, 
        ease: "expo.out", 
        delay: 0.2 
      }
    );

    // Mouse parallax effect on the whole container
    const xTo = gsap.quickTo(textRef.current, "x", { duration: 0.8, ease: "power3" });
    const yTo = gsap.quickTo(textRef.current, "y", { duration: 0.8, ease: "power3" });

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      // Calculate normalized mouse position (-1 to 1)
      const x = (e.clientX / innerWidth - 0.5) * 2;
      const y = (e.clientY / innerHeight - 0.5) * 2;
      
      // Shift text by max 40px
      xTo(x * 40);
      yTo(y * 40);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <section ref={containerRef} style={{
      position: "relative",
      height: "100vh",
      background: "#000000",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      
      {/* The Liquid WebGL Background */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
        <LiquidImage src="/awwwards_hero_bg.jpg" />
      </div>

      {/* The Mask Layer */}
      {/* 
        By placing a black div with mix-blend-mode: multiply over the WebGL,
        and putting white text inside it, the WebGL only shows through the white text.
      */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2,
        background: "#000000",
        mixBlendMode: "multiply", // Black stays black, white becomes transparent
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}>
        <h1 
          ref={textRef}
          className="display"
          style={{
            color: "#FFFFFF",
            fontSize: "clamp(120px, 20vw, 360px)",
            lineHeight: 0.8,
            letterSpacing: "-0.05em",
            textAlign: "center",
            whiteSpace: "nowrap",
            willChange: "transform",
            perspective: "1000px" // For 3D rotation of chars
          }}
        >
          <div style={{ overflow: "hidden", paddingBottom: "0.1em", marginBottom: "-0.1em" }}>
            {"GAME".split("").map((c, i) => (
              <span key={`g-${i}`} className="hero-char" style={{ display: "inline-block", willChange: "transform" }}>{c}</span>
            ))}
          </div>
          <div className="display-serif" style={{ fontSize: "1.1em", fontStyle: "italic", overflow: "hidden", paddingRight: "0.1em", paddingBottom: "0.1em", marginBottom: "-0.1em" }}>
            {"GROUND".split("").map((c, i) => (
              <span key={`r-${i}`} className="hero-char" style={{ display: "inline-block", willChange: "transform" }}>{c}</span>
            ))}
          </div>
        </h1>
      </div>

      {/* Supporting Elements */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
        display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: "12vh"
      }}>
        <p style={{
          color: "#fff", maxWidth: 400, textAlign: "center", fontSize: 13,
          letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 500,
          opacity: 0.6
        }}>
          Train with verified coaches, drop into pickup games, and show up for the tournaments your city actually plays.
        </p>
      </div>

    </section>
  );
}
