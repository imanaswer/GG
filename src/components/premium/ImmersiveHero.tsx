"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { LiquidImage } from "@/components/premium/LiquidImage";

gsap.registerPlugin(ScrollTrigger);

export function ImmersiveHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !textContainerRef.current) return;
    
    // Force scroll to 0 BEFORE ScrollTrigger calculates positions
    window.scrollTo(0, 0);
    
    const ctx = gsap.context(() => {
      // Premium cinematic load effect (blur + scale + y translate)
      const chars = gsap.utils.toArray<HTMLElement>(".hero-char");
      gsap.fromTo(chars,
        { y: 200, opacity: 0, filter: "blur(20px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: 1.8, stagger: 0.03, ease: "power4.out", delay: 0.1, clearProps: "all" }
      );

      // Zoom-through scroll interaction
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: () => `+=${window.innerHeight * 2.5}`, // Scroll for 2.5x screen height
          scrub: 1.5,
          pin: true,
        }
      });

      // Scale the text massively so the user goes through the 'O' in GROUND
      tl.to(textContainerRef.current, {
        scale: 45,
        transformOrigin: "58% 70%", 
        ease: "power2.in",
        duration: 1,
        immediateRender: false
      });

      // Fade out and HIDE the text right at the end to avoid pixelation and GPU clipping artifacts
      tl.to(textContainerRef.current, {
        autoAlpha: 0, // This sets visibility: hidden, removing it from GPU processing when invisible
        duration: 0.1
      }, "-=0.1");
    }, containerRef);

    return () => ctx.revert();
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
      
      <div style={{ position: "absolute", inset: -5, zIndex: 1 }}>
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="/awwwards_hero_bg.jpg"
          src="/video.mp4" 
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.05)" }} 
        />
      </div>

      {/* The Multiply Mask */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2,
        background: "#000000",
        mixBlendMode: "multiply",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}>
        <div ref={textContainerRef}>
          <h1 
            style={{
              fontFamily: "var(--font-dela)",
              color: "#FFFFFF",
              fontSize: "clamp(45px, 14vw, 240px)",
              lineHeight: 0.9,
              letterSpacing: "-0.02em",
              textAlign: "center",
              whiteSpace: "nowrap",
              perspective: "1000px"
            }}
          >
            <div style={{ overflow: "hidden" }}>
              {"GAME".split("").map((c, i) => (
                <span key={`g-${i}`} className="hero-char" style={{ display: "inline-block" }}>{c}</span>
              ))}
            </div>
            <div style={{ overflow: "hidden" }}>
              {"GROUND".split("").map((c, i) => (
                <span key={`r-${i}`} className="hero-char" style={{ display: "inline-block" }}>{c}</span>
              ))}
            </div>
          </h1>
        </div>
      </div>

    </section>
  );
}
