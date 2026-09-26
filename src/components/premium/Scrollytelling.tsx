"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

/* --- SVGs --- */

function CourtHalf() {
  return (
    <svg viewBox="0 0 500 500" style={{ width: "100%", height: "100%", maxWidth: 500, overflow: "visible" }}>
      {/* Background Court Lines */}
      <g stroke="rgba(240,235,225,0.15)" strokeWidth="2" fill="none">
        <path d="M 0,450 L 500,450" /> {/* Baseline */}
        <path d="M 150,450 L 150,250 L 350,250 L 350,450" /> {/* Paint */}
        <path d="M 190,450 L 190,250 L 310,250 L 310,450" /> {/* Inner Paint */}
        <path d="M 50,450 Q 50,150 250,150 Q 450,150 450,450" /> {/* 3pt line */}
        <circle cx="250" cy="250" r="60" strokeDasharray="10, 10" /> {/* Free throw circle */}
        <circle cx="250" cy="400" r="15" /> {/* Hoop */}
        <path d="M 220,415 L 280,415" strokeWidth="4" /> {/* Backboard */}
      </g>
      
      {/* Animated Data Points */}
      <g className="data-points-1">
        <circle cx="100" cy="300" r="12" fill="#E63946" className="point" />
        <circle cx="100" cy="300" r="18" stroke="#E63946" strokeWidth="1" fill="none" className="point-ring" />
        
        <circle cx="420" cy="200" r="12" fill="#E63946" className="point" />
        
        <circle cx="250" cy="280" r="12" fill="#F0EBE1" className="point" />
        <circle cx="270" cy="310" r="12" fill="#F0EBE1" className="point" />
        <circle cx="230" cy="330" r="12" fill="#F0EBE1" className="point" />
      </g>
    </svg>
  );
}

function CourtFull() {
  return (
    <svg viewBox="0 0 800 400" style={{ width: "100%", height: "100%", maxWidth: 800, overflow: "visible" }}>
      {/* Background Court Lines */}
      <g stroke="rgba(240,235,225,0.15)" strokeWidth="2" fill="none">
        <rect x="50" y="50" width="700" height="300" /> {/* Bounds */}
        <line x1="400" y1="50" x2="400" y2="350" /> {/* Half court line */}
        <circle cx="400" cy="200" r="50" /> {/* Center circle */}
        
        {/* Left Paint */}
        <rect x="50" y="125" width="100" height="150" />
        <path d="M 50,75 Q 200,75 200,200 Q 200,325 50,325" /> {/* Left 3pt */}
        
        {/* Right Paint */}
        <rect x="650" y="125" width="100" height="150" />
        <path d="M 750,75 Q 600,75 600,200 Q 600,325 750,325" /> {/* Right 3pt */}
      </g>
      
      {/* Animated Data Points */}
      <g className="data-points-2">
        {/* Red Team */}
        <circle cx="350" cy="150" r="8" fill="#E63946" className="point" />
        <circle cx="200" cy="250" r="8" fill="#E63946" className="point" />
        <circle cx="280" cy="80" r="8" fill="#E63946" className="point" />
        <circle cx="450" cy="300" r="8" fill="#E63946" className="point" />
        <circle cx="650" cy="200" r="8" fill="#E63946" className="point" />
        
        {/* White Team */}
        <circle cx="420" cy="180" r="8" fill="#F0EBE1" className="point" />
        <circle cx="500" cy="120" r="8" fill="#F0EBE1" className="point" />
        <circle cx="550" cy="280" r="8" fill="#F0EBE1" className="point" />
        <circle cx="300" cy="320" r="8" fill="#F0EBE1" className="point" />
        <circle cx="150" cy="180" r="8" fill="#F0EBE1" className="point" />

        {/* Lines indicating passes/movement */}
        <path d="M 200,250 L 350,150 L 450,300" stroke="#E63946" strokeWidth="1" strokeDasharray="4,4" fill="none" className="pass-line" />
        <path d="M 500,120 L 420,180" stroke="#F0EBE1" strokeWidth="1" strokeDasharray="4,4" fill="none" className="pass-line" />
      </g>
    </svg>
  );
}

function BracketGraph() {
  return (
    <svg viewBox="0 0 500 400" style={{ width: "100%", height: "100%", maxWidth: 500, overflow: "visible" }}>
      <g stroke="rgba(240,235,225,0.15)" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round">
        {/* Bracket Lines */}
        <path d="M 50,50 L 150,50 L 150,100 L 250,100" />
        <path d="M 50,150 L 150,150 L 150,100" />
        
        <path d="M 50,250 L 150,250 L 150,300 L 250,300" />
        <path d="M 50,350 L 150,350 L 150,300" />

        <path d="M 250,100 L 350,100 L 350,200 L 450,200" />
        <path d="M 250,300 L 350,300 L 350,200" />
      </g>
      
      {/* Animated Data Points */}
      <g className="data-points-3">
        {/* Progression Dots */}
        <circle cx="50" cy="50" r="6" fill="#F0EBE1" className="point" />
        <circle cx="50" cy="150" r="6" fill="#747574" className="point" />
        <circle cx="150" cy="100" r="8" fill="#E63946" className="point" />
        
        <circle cx="50" cy="250" r="6" fill="#747574" className="point" />
        <circle cx="50" cy="350" r="6" fill="#F0EBE1" className="point" />
        <circle cx="150" cy="300" r="8" fill="#747574" className="point" />

        <circle cx="350" cy="200" r="10" fill="#E63946" className="point" />
        
        <circle cx="450" cy="200" r="14" fill="#E63946" className="point-winner" />
        <circle cx="450" cy="200" r="22" stroke="#E63946" strokeWidth="2" fill="none" strokeDasharray="4 4" className="point-winner-ring" />
      </g>
    </svg>
  );
}

/* --- Component --- */

const PANELS = [
  {
    id: "panel-1",
    label: "PHASE 1",
    title: "The Build Up",
    description: "Training isn't optional. Find pro coaches and academies that match your ambition. Master your mechanics before you step on the court.",
    stats: "COACHES / ACADEMIES / DRILLS",
    svg: <CourtHalf />
  },
  {
    id: "panel-2",
    label: "PHASE 2",
    title: "The Match",
    description: "Drop into instant pickup games across the city. 24 players. 1 court. No waiting, no empty promises. The squad assembles instantly.",
    stats: "PICKUP / 5v5 / TURF",
    svg: <CourtHalf />
  },
  {
    id: "panel-3",
    label: "PHASE 3",
    title: "The Legacy",
    description: "City-wide tournaments. Track your stats, rise up the leaderboard, and leave a mark. This is where legends are documented.",
    stats: "TOURNAMENTS / LEADERBOARD / STATS",
    svg: <BracketGraph />
  }
];

export function Scrollytelling() {
  const sectionRef = useRef<HTMLElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
        gsap.registerPlugin(ScrollTrigger);

        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        const panels = gsap.utils.toArray(".horizontal-panel") as HTMLElement[];
        
        // 1. Horizontal Scroll Tween on the WRAPPER (standard scrollWidth approach)
        const scrollTween = gsap.to(wrapper, {
          x: () => -(wrapper.scrollWidth - window.innerWidth),
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            pin: true,
            scrub: 1,
            end: () => "+=" + (wrapper.scrollWidth - window.innerWidth), // Match scroll distance to actual scroll width
            invalidateOnRefresh: true,
          }
        });

        // 2. Animate SVGs as they enter the screen
        panels.forEach((panel) => {
          const points = panel.querySelectorAll(".point");
          if (points.length > 0) {
            gsap.fromTo(points, 
              { scale: 0, opacity: 0, transformOrigin: "center center" },
              { 
                scale: 1, opacity: 1, 
                stagger: 0.1, duration: 0.5, ease: "back.out(2)",
                scrollTrigger: {
                  trigger: panel,
                  containerAnimation: scrollTween,
                  start: "left center",
                  toggleActions: "play none none reverse"
                }
              }
            );
          }
          
          const passLines = panel.querySelectorAll(".pass-line");
          if (passLines.length > 0) {
            gsap.fromTo(passLines,
              { strokeDashoffset: 100 },
              {
                strokeDashoffset: 0,
                duration: 1,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: panel,
                  containerAnimation: scrollTween,
                  start: "left center",
                  toggleActions: "play none none reverse"
                }
              }
            );
          }
          
          const winnerRings = panel.querySelectorAll(".point-winner-ring");
          if (winnerRings.length > 0) {
            gsap.to(winnerRings, {
              rotation: 360,
              transformOrigin: "center center",
              duration: 10,
              repeat: -1,
              ease: "none",
            });
          }
        });

        // Robust refresh to fix black layout issues downstream
        const refreshId = setInterval(() => {
          ScrollTrigger.refresh();
        }, 200);
        setTimeout(() => clearInterval(refreshId), 2000);

      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <>
      <style>{`
        .scrolly-label {
          font-family: 'DM Mono', monospace;
          font-size: 0.85rem;
          letter-spacing: 0.2em;
          color: #E63946;
          margin-bottom: 24px;
        }
        .scrolly-title {
          font-family: 'Instrument Serif', serif;
          font-size: clamp(48px, 6vw, 110px);
          line-height: 0.95;
          letter-spacing: -0.02em;
          margin-bottom: 32px;
          color: #F0EBE1;
        }
        .scrolly-text {
          font-family: 'DM Mono', monospace;
          font-size: clamp(14px, 1vw, 16px);
          line-height: 1.8;
          color: rgba(240,235,225,0.6);
        }
        .scrolly-stats {
          font-family: 'DM Mono', monospace;
          font-size: 0.75rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(240,235,225,0.3);
          margin-top: 40px;
          border-top: 1px solid rgba(240,235,225,0.1);
          padding-top: 24px;
        }
        /* Grain overlay */
        .scrolly-grain {
          position: absolute;
          inset: 0;
          background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          opacity: 0.05;
          pointer-events: none;
          mix-blend-mode: overlay;
          z-index: 20;
        }

        @media (max-width: 900px) {
          .mobile-stack {
            flex-direction: column !important;
            justify-content: center !important;
            padding-top: 10vh !important;
          }
          .mobile-visual {
            height: 40vh !important;
            width: 100% !important;
          }
          .mobile-content {
            height: 50vh !important;
          }
        }
      `}</style>

      <section ref={sectionRef} className="scrolly-container" style={{
        overflow: "hidden",
        background: "#050505",
        color: "#F0EBE1",
        height: "100vh",
        width: "100%",
        position: "relative"
      }}>
        <div ref={wrapperRef} className="scrolly-wrapper" style={{
          display: "flex",
          flexWrap: "nowrap",
          width: "max-content",
          height: "100%"
        }}>
          {PANELS.map((panel, i) => {
            const debugBg = i === 0 ? "rgba(255,0,0,0.05)" : i === 1 ? "rgba(0,255,0,0.05)" : "rgba(0,0,255,0.05)";
            return (
            <div key={panel.id} className="horizontal-panel mobile-stack" style={{
              width: "100vw",
              height: "100vh",
              display: "flex",
              alignItems: "center",
              padding: "0 5vw",
              position: "relative",
              flexShrink: 0,
              boxSizing: "border-box",
              background: debugBg
            }}>
              <div className="scrolly-grain" />
              
              <div className="panel-content mobile-content" style={{
                flex: 1,
                maxWidth: 500,
                position: "relative",
                zIndex: 10
              }}>
                <div className="scrolly-label">{panel.label}</div>
                <h2 className="scrolly-title">{panel.title}</h2>
                <p className="scrolly-text">{panel.description}</p>
                <div className="scrolly-stats">{panel.stats}</div>
              </div>

              <div className="panel-visual mobile-visual" style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                position: "relative",
                zIndex: 5
              }}>
                {panel.svg}
              </div>
            </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
