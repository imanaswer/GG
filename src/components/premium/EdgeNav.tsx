"use client";
import Link from "next/link";
import { motion } from "framer-motion";

export function EdgeNav() {
  return (
    <>
      <style>{`
        .pn-edge-marquee { display: none; }
        .pn-edge-scroll {
          top: 96px;
          bottom: auto;
          right: 24px;
        }
        @media (min-width: 768px) {
          .pn-edge-marquee { display: flex; }
          .pn-edge-scroll {
            top: 32px;
            bottom: auto;
            right: 32px;
          }
        }
      `}</style>
      <nav style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100
      }}>
        {/* Left Edge Vertical Marquee */}
        <div className="pn-edge-marquee" style={{
          position: "absolute",
          left: 32,
          top: 0,
          bottom: 0,
          width: 20,
          overflow: "hidden",
          justifyContent: "center",
        }}>
          <motion.div
            animate={{ y: ["-50%", "0%"] }}
            transition={{ duration: 25, ease: "linear", repeat: Infinity }}
            style={{ 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center" 
            }}
          >
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ 
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                whiteSpace: "nowrap",
                fontSize: 10, 
                fontWeight: 500, 
                letterSpacing: "0.2em", 
                textTransform: "uppercase",
                color: "#747574",
                padding: "80px 0"
              }}>
                Kozhikode&apos;s Sports Playbook
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom Edge (Right Side Only) */}
        <div className="pn-edge-scroll" style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
           <span style={{ writingMode: "vertical-rl", fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "#747574" }}>
             Scroll
           </span>
           <motion.div
             animate={{ height: [0, 40, 0], opacity: [0, 1, 0] }}
             transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
             style={{ width: 1, background: "#fff" }}
           />
        </div>
      </nav>

      {/* Global Noise Overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none", opacity: 0.04,
        background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
      }} />
    </>
  );
}
