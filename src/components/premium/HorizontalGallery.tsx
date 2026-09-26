"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, GraduationCap, Users, Trophy, Target, Lightbulb } from "lucide-react";
import { STORY, CAMP_IMAGE, EVENT_IMAGE, WORKSHOP_IMAGE } from "@/lib/premium-images";

gsap.registerPlugin(ScrollTrigger);

const HUB_CARDS = [
  {
    href: "/learn",
    eyebrow: "01 — Train",
    title: "Learn",
    tagline: "Coaches & academies, verified in person.",
    icon: GraduationCap,
    image: STORY.learn.src,
    features: ["50+ expert coaches", "Flexible schedules", "Every skill level"]
  },
  {
    href: "/play",
    eyebrow: "02 — Play",
    title: "Play",
    tagline: "Pickup games, five minutes from home.",
    icon: Users,
    image: STORY.play.src,
    features: ["Instant matching", "Local courts", "Skill-matched partners"]
  },
  {
    href: "/events",
    eyebrow: "03 — Compete",
    title: "Events",
    tagline: "Tournaments and city-wide competitions.",
    icon: Trophy,
    image: EVENT_IMAGE.src,
    features: ["Open tournaments", "Cash prizes", "Official leagues"]
  },
  {
    href: "/camps",
    eyebrow: "04 — Level up",
    title: "Camps",
    tagline: "Seasonal sports camps for all ages.",
    icon: Target,
    image: CAMP_IMAGE.src,
    features: ["Pro trainers", "Structured learning", "Limited batches"]
  }
];

export function HorizontalGallery() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const container = containerRef.current;
    if (!section || !container) return;

    // Use matchMedia to only apply on desktop
    const mm = gsap.matchMedia();

    mm.add("(min-width: 900px)", () => {
      const scrollWidth = container.scrollWidth - window.innerWidth;
      const cards = gsap.utils.toArray(".gallery-card");
      
      const tl = gsap.to(container, {
        x: -scrollWidth,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          pin: true,
          scrub: 1,
          start: "top top",
          end: () => `+=${scrollWidth}`,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            // Velocity skew effect
            const velocity = self.getVelocity();
            // Map velocity to skew amount (clamp it so it doesn't get crazy)
            const skewAmount = gsap.utils.clamp(-15, 15, velocity / 100);
            
            gsap.to(cards, {
              skewX: skewAmount,
              duration: 0.8,
              ease: "power3.out",
              overwrite: "auto"
            });
          }
        }
      });
      return () => { tl.kill(); };
    });

    return () => mm.revert();
  }, []);

  return (
    <section 
      ref={sectionRef} 
      style={{ 
        position: "relative",
        background: "#180D0D", // Coffee Bean
        overflow: "hidden" 
      }}
    >
      <div 
        ref={containerRef}
        style={{
          display: "flex",
          gap: "4vw",
          padding: "120px 4vw",
          width: "fit-content",
          willChange: "transform",
        }}
      >
        <div style={{ width: "30vw", flexShrink: 0, paddingRight: "4vw", display: "flex", flexDirection: "column", justifyContent: "center" }}>
           <span className="eyebrow" style={{ color: "#747574", marginBottom: 16 }}>Five ways in</span>
           <h2 className="display" style={{ fontSize: "clamp(48px, 6vw, 96px)", color: "#FFFFFF", lineHeight: 1 }}>
             Pick your <br/>
             <span className="display-serif" style={{ color: "#DCDDDA" }}>entry.</span>
           </h2>
           <p style={{ marginTop: 24, fontSize: "clamp(16px, 1.5vw, 20px)", color: "#747574", lineHeight: 1.6 }}>
             Whether you&apos;re here to train, drop in, compete, or level up — jump straight to what you need.
           </p>
        </div>

        {HUB_CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <Link 
              key={card.href} 
              href={card.href}
              data-cursor-text="Explore"
              style={{
                width: "40vw",
                minWidth: 320,
                height: "65vh",
                minHeight: 480,
                position: "relative",
                flexShrink: 0,
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.05)",
                display: "flex",
                flexDirection: "column",
                textDecoration: "none",
              }}
              className="gallery-card group"
            >
              <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
                <Image
                  src={card.image}
                  alt={card.title}
                  fill
                  style={{ objectFit: "cover", transition: "transform 1s cubic-bezier(0.16,1,0.3,1), filter 1s" }}
                  className="gallery-img saturate-0 group-hover:saturate-100 group-hover:scale-105"
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 0%, rgba(24,13,13,0.9) 100%)" }} />
              </div>
              
              <div style={{ position: "relative", zIndex: 1, padding: 32, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
                <div style={{
                  padding: "6px 12px",
                  borderRadius: 100,
                  background: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(10px)",
                  fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
                  color: "#FFFFFF", alignSelf: "flex-start"
                }}>
                  {card.eyebrow}
                </div>

                <div>
                  <h3 className="display" style={{ fontSize: "clamp(36px, 4vw, 56px)", color: "#FFFFFF", marginBottom: 8 }}>
                    {card.title}
                  </h3>
                  <p style={{ fontSize: 16, color: "#DCDDDA", marginBottom: 24 }}>
                    {card.tagline}
                  </p>
                  
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                    {card.features.map((feat, idx) => (
                      <li key={idx} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#FFFFFF", flexShrink: 0 }} />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
