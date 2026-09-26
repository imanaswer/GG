"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import { STORY, CAMP_IMAGE, EVENT_IMAGE } from "@/lib/premium-images";

gsap.registerPlugin(ScrollTrigger);

const CARDS = [
  { id: "learn", image: STORY.learn.src, title: "Train.", x: -20, y: -15, rot: -8, gridCol: 1, gridRow: 1 },
  { id: "play", image: STORY.play.src, title: "Play.", x: 25, y: -25, rot: 12, gridCol: 2, gridRow: 1 },
  { id: "events", image: EVENT_IMAGE.src, title: "Compete.", x: -30, y: 20, rot: -14, gridCol: 1, gridRow: 2 },
  { id: "camps", image: CAMP_IMAGE.src, title: "Level Up.", x: 30, y: 15, rot: 6, gridCol: 2, gridRow: 2 },
];

export function ScatterHub() {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!containerRef.current || !triggerRef.current) return;
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".scatter-card");
      
      // Initialize scattered state
      cards.forEach((card, i) => {
        gsap.set(card, {
          xPercent: CARDS[i].x,
          yPercent: CARDS[i].y,
          rotation: CARDS[i].rot,
          scale: 1.2
        });
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: triggerRef.current,
          start: "top top",
          end: "+=250%",
          scrub: 1,
          pin: true,
        }
      });

      // Animate into grid
      tl.to(cards, {
        xPercent: 0,
        yPercent: 0,
        rotation: 0,
        scale: 1,
        duration: 1,
        stagger: 0.1,
        ease: "power3.inOut"
      }, 0);

      // Fade in text overlays
      const titles = gsap.utils.toArray(".scatter-title");
      tl.fromTo(titles, {
        opacity: 0, y: 20
      }, {
        opacity: 1, y: 0,
        duration: 0.5,
        stagger: 0.1,
      }, 0.8);

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={triggerRef} style={{ background: "#050505", color: "#fff", position: "relative" }}>
      <div ref={containerRef} style={{
        height: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden"
      }}>
        
        {/* Massive background text that fades as grid forms */}
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 0, pointerEvents: "none"
        }}>
          <h2 className="display" style={{ fontSize: "clamp(64px, 12vw, 200px)", color: "#111", letterSpacing: "-0.05em" }}>
            PICK YOUR ENTRY
          </h2>
        </div>

        {/* The Grid Container */}
        <div style={{
          position: "relative", zIndex: 1,
          width: "90vw", maxWidth: 1200, height: "80vh",
          display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr",
          gap: "2vw"
        }}>
          {CARDS.map((card, i) => (
            <Link 
              key={card.id}
              href={`/${card.id}`}
              className="scatter-card group"
              data-cursor-text="Explore"
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                borderRadius: 12,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.05)",
                display: "block",
                willChange: "transform"
              }}
            >
              <Image 
                src={card.image}
                alt={card.title}
                fill
                style={{ objectFit: "cover", transition: "transform 1s cubic-bezier(0.16,1,0.3,1), filter 1s" }}
                className="saturate-0 group-hover:saturate-100 group-hover:scale-105"
              />
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", transition: "background 0.5s" }} className="group-hover:bg-black/10" />
              
              <div className="scatter-title" style={{
                position: "absolute", bottom: 32, left: 32,
              }}>
                <h3 className="display" style={{ fontSize: "clamp(32px, 4vw, 64px)", lineHeight: 1 }}>
                  {card.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
