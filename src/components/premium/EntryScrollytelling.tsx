"use client";
import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useInView, type MotionValue } from "framer-motion";
import { KineticTextReveal, KineticTextRevealRef } from "@/components/ui/kinetic-text-reveal";

function Asset01() {
  return (
    <svg viewBox="0 0 400 500" style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <style>{`
        @keyframes dashFlow {
          from { stroke-dashoffset: 120; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes pulseCone {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.6; }
        }
        .flow-path {
          animation: dashFlow 4s linear infinite;
        }
        .pulse-cone {
          transform-origin: center;
          animation: pulseCone 2s ease-in-out infinite;
        }
      `}</style>
      
      {/* Agility Ladder */}
      <g stroke="rgba(240,235,225,0.15)" strokeWidth="2" fill="none">
        <rect x="80" y="100" width="60" height="300" />
        {/* Ladder Rungs */}
        <line x1="80" y1="150" x2="140" y2="150" />
        <line x1="80" y1="200" x2="140" y2="200" />
        <line x1="80" y1="250" x2="140" y2="250" />
        <line x1="80" y1="300" x2="140" y2="300" />
        <line x1="80" y1="350" x2="140" y2="350" />
      </g>

      {/* Training Cones */}
      <g fill="none" stroke="#FFFFFF" strokeWidth="2">
        <circle cx="250" cy="150" r="5" fill="#FFFFFF" className="pulse-cone" style={{ transformOrigin: "250px 150px", animationDelay: "0s" }} />
        <circle cx="320" cy="225" r="5" fill="#FFFFFF" className="pulse-cone" style={{ transformOrigin: "320px 225px", animationDelay: "0.2s" }} />
        <circle cx="250" cy="300" r="5" fill="#FFFFFF" className="pulse-cone" style={{ transformOrigin: "250px 300px", animationDelay: "0.4s" }} />
        <circle cx="320" cy="375" r="5" fill="#FFFFFF" className="pulse-cone" style={{ transformOrigin: "320px 375px", animationDelay: "0.6s" }} />
      </g>

      {/* Drill Movement Path */}
      <g stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" fill="none" strokeDasharray="6,6" className="flow-path">
        {/* Path running up the ladder and looping to the cones */}
        <path d="M 110 420 L 110 80 C 110 40, 250 40, 250 100" />
        {/* Path zig-zagging through cones */}
        <path d="M 250 100 L 250 150 L 320 225 L 250 300 L 320 375 L 270 425" />
      </g>

      {/* Start Point */}
      <circle cx="110" cy="420" r="6" fill="#747574" />
      <text x="90" y="445" fill="#747574" fontSize="10" fontFamily="monospace" letterSpacing="2">START</text>
      
      {/* End Arrow */}
      <polygon points="270,425 270,415 280,425" fill="#FFFFFF" />
    </svg>
  );
}

function Asset02() {
  return (
    <svg viewBox="0 0 400 500" style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <style>{`
        @keyframes moveWinger {
          0% { offset-distance: 0%; opacity: 0; }
          10% { opacity: 1; }
          80% { offset-distance: 100%; opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }
        @keyframes moveBall {
          0% { offset-distance: 0%; opacity: 0; }
          30% { offset-distance: 0%; opacity: 0; }
          40% { opacity: 1; }
          90% { offset-distance: 100%; opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }
        .winger-run {
          offset-path: path("M 130 170 Q 110 110 150 80");
          animation: moveWinger 3s ease-in-out infinite;
        }
        .ball-pass {
          offset-path: path("M 165 250 L 190 155");
          animation: moveBall 3s ease-out infinite;
        }
      `}</style>
      
      {/* Pitch Lines - Full tactical board view */}
      <g stroke="rgba(240,235,225,0.15)" strokeWidth="1.5" fill="none">
        {/* Pitch boundary */}
        <path d="M 50 50 L 350 50 L 350 450 L 50 450 Z" />
        {/* Center line */}
        <line x1="50" y1="250" x2="350" y2="250" />
        {/* Center circle */}
        <circle cx="200" cy="250" r="50" />
        <circle cx="200" cy="250" r="3" fill="rgba(240,235,225,0.15)" />
        {/* Penalty boxes */}
        <path d="M 120 50 L 120 130 L 280 130 L 280 50" />
        <path d="M 120 450 L 120 370 L 280 370 L 280 450" />
      </g>
      
      {/* Animated Elements Group (appears on scroll) */}
      <motion.g
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: false, amount: 0.4 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Play vectors (Tactical arrows) */}
        <g stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1.5" fill="none" strokeDasharray="4,4">
          {/* Pass from Mid to Striker */}
          <path d="M 165 250 L 190 155" />
          <polygon points="185,160 195,145 195,165" fill="rgba(255, 255, 255, 0.3)" stroke="none" />
          
          {/* Winger run */}
          <path d="M 130 170 Q 110 110 150 80" />
          <polygon points="140,85 155,75 145,90" fill="rgba(255, 255, 255, 0.3)" stroke="none" />
        </g>

        {/* 5v5 Teams - Static Players */}
        {/* Team A (Attacking) */}
        <g fill="#FFFFFF">
          {/* Striker receiving ball */}
          <circle cx="200" cy="140" r="6" className="pulse-cone" style={{ transformOrigin: "200px 140px", animationDelay: "0.5s" }} />
          {/* Static teammates */}
          <circle cx="290" cy="190" r="6" />
          <circle cx="160" cy="260" r="6" />
          <circle cx="240" cy="260" r="6" />
        </g>

        {/* Team B (Defending) */}
        <g fill="#747574">
          <circle cx="150" cy="150" r="6" />
          <circle cx="220" cy="150" r="6" />
          <circle cx="260" cy="170" r="6" />
          <circle cx="180" cy="210" r="6" />
          <circle cx="220" cy="220" r="6" />
        </g>

        {/* Moving Elements */}
        {/* Winger moving along the curve */}
        <circle r="6" fill="#FFFFFF" className="winger-run" />
        {/* Ball moving along the pass line */}
        <circle r="4" fill="#747574" className="ball-pass" />
      </motion.g>
      
    </svg>
  );
}

function Asset03() {
  return (
    <svg viewBox="0 0 400 500" style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <style>{`
        @keyframes drawBracket {
          0% { stroke-dasharray: 400; stroke-dashoffset: 400; }
          100% { stroke-dasharray: 400; stroke-dashoffset: 0; }
        }
        @keyframes moveChampion {
          0% { transform: translate(50px, 150px); opacity: 0; }
          10% { transform: translate(50px, 150px); opacity: 1; }
          22% { transform: translate(100px, 150px); }
          34% { transform: translate(100px, 200px); }
          46% { transform: translate(150px, 200px); }
          58% { transform: translate(200px, 200px); }
          70% { transform: translate(200px, 250px); }
          85% { transform: translate(300px, 250px); opacity: 1; }
          90% { transform: translate(300px, 250px); opacity: 0; }
          100% { transform: translate(300px, 250px); opacity: 0; }
        }
        .champion-path {
          animation: drawBracket 4s ease-in-out infinite;
        }
        .champion-node {
          animation: moveChampion 4s ease-in-out infinite;
        }
      `}</style>
      
      {/* Bracket / Tournament Graph */}
      <g stroke="rgba(240,235,225,0.15)" strokeWidth="1.5" fill="none">
        {/* Grey brackets */}
        <path d="M 50 150 L 100 150 L 100 200 L 150 200" />
        <path d="M 50 250 L 100 250 L 100 200" />
        
        <path d="M 50 350 L 100 350 L 100 300 L 150 300" />
        
        <path d="M 150 300 L 200 300 L 200 250" strokeWidth="2" />
        
        {/* The Champion's Path (Red, Animated) */}
        <path 
          d="M 50 150 L 100 150 L 100 200 L 150 200 L 200 200 L 200 250 L 300 250" 
          strokeWidth="2" 
          stroke="#FFFFFF" 
          className="champion-path" 
        />
        
        {/* Nodes */}
        <circle cx="50" cy="150" r="4" fill="#747574" />
        <circle cx="50" cy="250" r="4" fill="#747574" />
        <circle cx="50" cy="350" r="4" fill="#747574" />
        
        <circle cx="150" cy="200" r="4" fill="#FFFFFF" />
        <circle cx="150" cy="300" r="4" fill="#747574" />
        
        <circle cx="300" cy="250" r="8" fill="#FFFFFF" className="pulse-cone" style={{ animationDelay: "0s" }} />
        <circle cx="300" cy="250" r="16" stroke="#FFFFFF" strokeWidth="1" fill="none" />
      </g>
      
      {/* Moving Champion Node */}
      <circle r="6" fill="#FFFFFF" className="champion-node" />
    </svg>
  );
}

function Asset04() {
  return (
    <svg viewBox="0 0 400 500" style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <style>{`
        @keyframes drawRadar {
          0% { stroke-dasharray: 1000; stroke-dashoffset: 1000; fill: rgba(255, 255, 255, 0); opacity: 1; }
          40% { stroke-dasharray: 1000; stroke-dashoffset: 0; fill: rgba(255, 255, 255, 0); opacity: 1; }
          50% { stroke-dashoffset: 0; fill: rgba(255, 255, 255, 0.25); opacity: 1; }
          80% { stroke-dashoffset: 0; fill: rgba(255, 255, 255, 0.25); opacity: 1; }
          100% { stroke-dashoffset: 0; fill: rgba(255, 255, 255, 0); opacity: 0; }
        }
        @keyframes popDot {
          0%, 30% { opacity: 0; transform: scale(0); }
          45% { opacity: 1; transform: scale(1.5); }
          55%, 80% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0); }
        }
        .radar-path {
          animation: drawRadar 4s ease-in-out infinite;
        }
        .radar-dot {
          animation: popDot 4s ease-in-out infinite;
        }
      `}</style>
      
      {/* Radar Chart / Stats Profile */}
      <g stroke="rgba(240,235,225,0.15)" strokeWidth="1" fill="none">
        {/* Hexagons */}
        <polygon points="200,80 304,140 304,260 200,320 96,260 96,140" />
        <polygon points="200,120 269,160 269,240 200,280 131,240 131,160" />
        <polygon points="200,160 235,180 235,220 200,240 165,220 165,180" />
        
        {/* Axes */}
        <line x1="200" y1="200" x2="200" y2="80" />
        <line x1="200" y1="200" x2="304" y2="140" />
        <line x1="200" y1="200" x2="304" y2="260" />
        <line x1="200" y1="200" x2="200" y2="320" />
        <line x1="200" y1="200" x2="96" y2="260" />
        <line x1="200" y1="200" x2="96" y2="140" />
      </g>
      
      {/* Player Stats Path (Animated) */}
      <path 
        d="M 200 100 L 280 150 L 250 250 L 200 300 L 120 230 L 150 150 Z" 
        stroke="#FFFFFF" 
        strokeWidth="2" 
        className="radar-path"
      />
      
      {/* Dots (Animated) */}
      <circle cx="200" cy="100" r="4" fill="#FFFFFF" className="radar-dot" style={{ transformOrigin: "200px 100px", animationDelay: "0s" }} />
      <circle cx="280" cy="150" r="4" fill="#FFFFFF" className="radar-dot" style={{ transformOrigin: "280px 150px", animationDelay: "0.1s" }} />
      <circle cx="250" cy="250" r="4" fill="#FFFFFF" className="radar-dot" style={{ transformOrigin: "250px 250px", animationDelay: "0.2s" }} />
      <circle cx="200" cy="300" r="4" fill="#FFFFFF" className="radar-dot" style={{ transformOrigin: "200px 300px", animationDelay: "0.3s" }} />
      <circle cx="120" cy="230" r="4" fill="#FFFFFF" className="radar-dot" style={{ transformOrigin: "120px 230px", animationDelay: "0.4s" }} />
      <circle cx="150" cy="150" r="4" fill="#FFFFFF" className="radar-dot" style={{ transformOrigin: "150px 150px", animationDelay: "0.5s" }} />
    </svg>
  );
}

function Asset05() {
  return (
    <svg viewBox="0 0 400 500" style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <style>{`
        @keyframes pulseEvent {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes floatPin {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .event-ring {
          animation: pulseEvent 3s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        .event-pin {
          animation: floatPin 3s ease-in-out infinite;
        }
      `}</style>
      
      {/* Abstract Map Grid */}
      <g stroke="rgba(240,235,225,0.15)" strokeWidth="1" fill="none">
        <line x1="50" y1="100" x2="350" y2="100" />
        <line x1="50" y1="175" x2="350" y2="175" />
        <line x1="50" y1="250" x2="350" y2="250" />
        <line x1="50" y1="325" x2="350" y2="325" />
        <line x1="50" y1="400" x2="350" y2="400" />
        
        <line x1="100" y1="50" x2="100" y2="450" />
        <line x1="175" y1="50" x2="175" y2="450" />
        <line x1="250" y1="50" x2="250" y2="450" />
        <line x1="325" y1="50" x2="325" y2="450" />
      </g>
      
      {/* Event Nodes */}
      <circle cx="100" cy="175" r="4" fill="#747574" />
      <circle cx="250" cy="100" r="4" fill="#747574" />
      <circle cx="325" cy="325" r="4" fill="#747574" />
      <circle cx="100" cy="400" r="4" fill="#747574" />
      
      {/* Main Event Highlight */}
      <circle cx="175" cy="250" r="20" fill="none" stroke="#FFFFFF" strokeWidth="2" className="event-ring" style={{ transformOrigin: "175px 250px", animationDelay: "0s" }} />
      <circle cx="175" cy="250" r="20" fill="none" stroke="#FFFFFF" strokeWidth="2" className="event-ring" style={{ transformOrigin: "175px 250px", animationDelay: "1.5s" }} />
      
      {/* Map Pin */}
      <g className="event-pin">
        <path d="M 175 250 C 160 220 160 200 175 200 C 190 200 190 220 175 250 Z" fill="#FFFFFF" />
        <circle cx="175" cy="215" r="4" fill="#000000" />
      </g>
    </svg>
  );
}

const PHASES = [
  {
    id: "01",
    label: "TRAIN",
    title: "10,000",
    subtitle: "HOURS OF REPETITION",
    desc: "We didn't just build a directory. We partnered with the most ruthless academies in the city. Professional coaching. Elite environments. The groundwork is laid here before you step onto the real turf.",
    stats: [
      { label: "ACADEMIES", value: "12" },
      { label: "COACHES", value: "50+" },
      { label: "DRILLS", value: "300" }
    ],
    svg: <Asset01 />
  },
  {
    id: "02",
    label: "PLAY",
    title: "5v5",
    subtitle: "INSTANT SQUAD UP",
    desc: "Drop into instant pickup games across the city. 24 players. 1 court. No waiting, no empty promises. The squad assembles instantly. Book slots or join an open game with zero friction.",
    stats: [
      { label: "VENUES", value: "8+" },
      { label: "PLAYERS", value: "24/7" },
      { label: "MATCHES", value: "1K+" }
    ],
    svg: <Asset02 />
  },
  {
    id: "03",
    label: "COMPETE",
    title: "#1",
    subtitle: "LEAVE A LEGACY",
    desc: "City-wide tournaments that matter. Track your real-time stats, rise up the global leaderboard, and cement your reputation. This is where local legends are documented and ranked.",
    stats: [
      { label: "TOURNAMENTS", value: "14" },
      { label: "TEAMS", value: "120" },
      { label: "PRIZE POOL", value: "₹50K" }
    ],
    svg: <Asset03 />
  },
  {
    id: "04",
    label: "MASTER",
    title: "ELITE",
    subtitle: "EXCLUSIVE WORKSHOPS",
    desc: "Exclusive masterclasses and specialized training camps right here in Kozhikode. We bring down top-tier coaches and pro players to help you break down your mechanics and elevate your game.",
    stats: [
      { label: "COACHES", value: "12+" },
      { label: "CAMPS", value: "4/YR" },
      { label: "FOCUS", value: "PRO" }
    ],
    svg: <Asset04 />
  },
  {
    id: "05",
    label: "EVENTS",
    title: "LIVE",
    subtitle: "THE COMMUNITY HUB",
    desc: "From massive sports screenings to local fan meetups and charity runs. Game Ground isn't just about playing; it's about building Kozhikode's biggest sports community.",
    stats: [
      { label: "EVENTS", value: "Monthly" },
      { label: "COMMUNITY", value: "Active" },
      { label: "CULTURE", value: "Sports" }
    ],
    svg: <Asset05 />
  }
];

export function EntryScrollytelling() {
  const targetRef = useRef<HTMLDivElement>(null);
  const kineticRef = useRef<KineticTextRevealRef>(null);
  
  const isInView = useInView(targetRef, { once: true, amount: 0.05 });

  useEffect(() => {
    if (isInView) {
      kineticRef.current?.play();
    }
  }, [isInView]);

  // Track scroll progress of the 400vh container
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end end"]
  });

  // We have 5 panels. Container is 500vw wide. 
  // To reach the last panel, we translate by -400vw.
  // -400vw / 500vw = -80%.
  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-80%"]);

  const scrollToIdx = (idx: number) => {
    if (!targetRef.current) return;
    
    const rect = targetRef.current.getBoundingClientRect();
    const startY = rect.top + window.scrollY;
    
    // total scrollable distance inside the 500vh container
    const totalScrollable = targetRef.current.offsetHeight - window.innerHeight;
    
    // We have 5 panels (indexes 0 to 4), so the scroll distance is divided into 4 segments.
    const targetY = startY + totalScrollable * (idx / 4);

    const lenis = window.__lenis;
    if (lenis) {
      lenis.scrollTo(targetY, { duration: 1.2, force: true });
    } else {
      window.scrollTo({
        top: targetY,
        behavior: "smooth"
      });
    }
  };


  return (
    <>
      <style>{`
        .entry-container {
          background: #000000;
          position: relative;
        }
        .entry-sticky {
          position: sticky;
          top: 0;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: #000000;
        }
        .entry-noise {
          position: absolute;
          inset: 0;
          background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          opacity: 0.03;
          pointer-events: none;
          z-index: 20;
        }
        
        .entry-panel {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          position: relative;
          box-sizing: border-box;
          padding: 0 5vw;
          flex-shrink: 0;
        }

        .entry-asset {
          flex: 1;
          height: 60vh;
          max-width: 450px;
          position: relative;
          z-index: 10;
        }

        .entry-content {
          flex: 1;
          max-width: 500px;
          margin-left: 8vw;
          position: relative;
          z-index: 10;
        }

        .entry-label {
          font-family: 'DM Mono', monospace;
          font-size: 0.75rem;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #747574;
          margin-bottom: 24px;
        }

        .entry-title {
          font-family: 'Instrument Serif', serif;
          font-size: clamp(60px, 8vw, 120px);
          line-height: 0.9;
          color: #F5F5F3;
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }

        .entry-subtitle {
          font-family: 'DM Mono', monospace;
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          color: #FFFFFF;
          margin-bottom: 32px;
          display: block;
        }

        .entry-desc {
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          line-height: 1.8;
          color: #DCDDDA;
          opacity: 0.7;
          margin-bottom: 48px;
        }

        .entry-stats-grid {
          display: flex;
          gap: 32px;
          border-top: 1px solid rgba(255,255,255,0.05);
          padding-top: 24px;
        }

        .entry-stat {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .entry-stat-val {
          font-family: 'Instrument Serif', serif;
          font-size: 32px;
          color: #F5F5F3;
          line-height: 1;
        }

        .entry-stat-label {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.15em;
          color: #747574;
        }

        /* Bam83 giant background number */
        .entry-watermark {
          position: absolute;
          right: -5%;
          top: 50%;
          transform: translateY(-50%);
          font-family: 'Instrument Serif', serif;
          font-size: clamp(400px, 60vw, 800px);
          line-height: 0.8;
          color: rgba(255,255,255,0.02);
          z-index: 1;
          pointer-events: none;
          user-select: none;
        }

        /* Bottom Nav */
        .entry-nav {
          position: absolute;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 24px;
          z-index: 30;
        }
        .nav-dot {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          color: #747574;
          transition: color 0.3s ease;
        }
        .nav-dot.active {
          color: #F5F5F3;
        }

        .entry-main-title {
          font-family: 'Instrument Serif', serif;
          font-size: clamp(32px, 4vw, 48px);
          color: #F5F5F3;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }

        .entry-main-title-wrapper {
          top: 5vh;
        }

        @media (max-width: 900px) {
          .entry-main-title-wrapper {
            top: 100px;
          }
          .entry-panel {
            flex-direction: column;
            justify-content: flex-start;
            padding-top: 10vh;
            padding-bottom: 80px;
          }
          .entry-asset {
            max-width: 100%;
            height: 20vh;
            margin-bottom: 2vh;
          }
          .entry-content {
            margin-left: 0;
            width: 100%;
          }
          .entry-watermark {
            font-size: 200px;
            right: -10%;
            top: 15%;
          }
          .entry-title {
            font-size: 48px;
            margin-bottom: 4px;
          }
          .entry-subtitle {
            margin-bottom: 16px;
          }
          .entry-desc {
            font-size: 13px;
            line-height: 1.5;
            margin-bottom: 20px;
          }
          .entry-stats-grid {
            gap: 16px;
            padding-top: 16px;
          }
          .entry-stat-val {
            font-size: 24px;
          }
          .entry-main-title {
            font-size: 28px;
          }
          .entry-nav {
            bottom: 20px;
            gap: 12px;
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <section ref={targetRef} className="entry-container" style={{ height: "500vh" }}>
        <div className="entry-sticky">
          <div className="entry-noise" />

          {/* Bam83 Title Section (Pinned top left) */}
          <div className="entry-main-title-wrapper" style={{
            position: "absolute", left: "5vw", zIndex: 40,
            pointerEvents: "none"
          }}>
            <h3 className="entry-main-title">
              <KineticTextReveal 
                ref={kineticRef}
                text={"The Game Ground\nJourney"}
                splitBy="lines"
                direction="up"
                distance={30}
                stagger={0.1}
                blur={true}
                autoPlay={false}
                delay={0}
              />
            </h3>
          </div>

          <motion.div 
            style={{ 
              x, 
              display: "flex", 
              width: "500vw", 
              height: "100%",
              willChange: "transform" 
            }}
          >
            {PHASES.map((phase, i) => (
              <div key={phase.id} className="entry-panel">
                <div className="entry-watermark">{i + 1}</div>
                
                <div className="entry-asset">
                  {phase.svg}
                </div>

                <div className="entry-content">
                  <div className="entry-label">{phase.label}</div>
                  <h2 className="entry-title">{phase.title}</h2>
                  <span className="entry-subtitle">{phase.subtitle}</span>
                  <p className="entry-desc">{phase.desc}</p>
                  
                  <div className="entry-stats-grid">
                    {phase.stats.map(stat => (
                      <div key={stat.label} className="entry-stat">
                        <span className="entry-stat-val">{stat.value}</span>
                        <span className="entry-stat-label">{stat.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>

          <div className="entry-nav">
             <NavIndicator scrollYProgress={scrollYProgress} index={0} label="TRAIN" onClick={() => scrollToIdx(0)} />
             <NavIndicator scrollYProgress={scrollYProgress} index={1} label="PLAY" onClick={() => scrollToIdx(1)} />
             <NavIndicator scrollYProgress={scrollYProgress} index={2} label="COMPETE" onClick={() => scrollToIdx(2)} />
             <NavIndicator scrollYProgress={scrollYProgress} index={3} label="MASTER" onClick={() => scrollToIdx(3)} />
             <NavIndicator scrollYProgress={scrollYProgress} index={4} label="EVENTS" onClick={() => scrollToIdx(4)} />
          </div>

        </div>
      </section>
    </>
  );
}

import { useMotionValueEvent } from "framer-motion";

function NavIndicator({ scrollYProgress, index, label, onClick }: { scrollYProgress: MotionValue<number>, index: number, label: string, onClick: () => void }) {
  const [isActive, setIsActive] = useState(index === 0);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    // 5 panels, so max index is 4. We round (latest * 4) to get the closest panel index.
    const activeIdx = Math.round(latest * 4);
    setIsActive(activeIdx === index);
  });

  return (
    <button 
      type="button"
      className={`nav-dot ${isActive ? "active" : ""}`}
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: "4px 8px",
        pointerEvents: "auto"
      }}
    >
      {label}
    </button>
  );
}
