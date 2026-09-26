"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

export function Preloader({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Simulate loading progress
      const tl = gsap.timeline({
        onComplete: () => {
          // Animate out the preloader logo
          gsap.to(logoRef.current, {
            opacity: 0,
            scale: 0.9,
            duration: 0.6,
            ease: "power2.inOut",
            onComplete: () => {
              // Unmount preloader and instantly trigger ImmersiveHero entry
              onComplete();
            }
          });
        }
      });

      // Keep it on screen for 2.5 seconds
      tl.to({}, { duration: 2.5 });
    }, containerRef);

    return () => ctx.revert();
  }, [onComplete]);

  return (
    <div 
      ref={containerRef}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        width: "100vw", height: "100vh",
        zIndex: 9999999, // Above everything including cursor during load
        pointerEvents: "none", 
      }}
    >
      <div
        ref={overlayRef}
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          width: "100%", height: "100%",
          background: "#000000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          willChange: "transform",
        }}
      >
        <div ref={logoRef} style={{ position: "relative", width: 240, height: 240, minWidth: 240, minHeight: 240, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <img 
            src="/loader-logo.png" 
            alt="Loading..." 
            width={140}
            height={140}
            style={{ width: 140, height: 140, minWidth: 140, minHeight: 140, objectFit: "contain", flexShrink: 0, filter: "drop-shadow(0 0 10px rgba(255,255,255,0.2))" }} 
          />
          <svg
            className="spinner-ring"
            viewBox="0 0 100 100"
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0, bottom: 0,
              width: "100%",
              height: "100%",
            }}
          >
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeDasharray="260"
              strokeDashoffset="60"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
      <style>{`
        .spinner-ring {
          animation: spin 1.4s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
