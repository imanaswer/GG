"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import Link from "next/link";
import { STORY, CAMP_IMAGE, EVENT_IMAGE } from "@/lib/premium-images";

const LIST_ITEMS = [
  { id: "learn", title: "Train.", image: STORY.learn.src, tagline: "Pro coaches & academies" },
  { id: "play", title: "Play.", image: STORY.play.src, tagline: "Instant pickup matches" },
  { id: "events", title: "Compete.", image: EVENT_IMAGE.src, tagline: "City-wide tournaments" },
  { id: "camps", title: "Level up.", image: CAMP_IMAGE.src, tagline: "Seasonal sports camps" },
];

export function CursorRevealList() {
  const containerRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || window.matchMedia("(pointer: coarse)").matches) return;
    
    const img = imageRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    // We center the image on the cursor
    gsap.set(img, { xPercent: -50, yPercent: -50, scale: 0.8, opacity: 0 });

    const xTo = gsap.quickTo(img, "x", { duration: 0.6, ease: "power3.out" });
    const yTo = gsap.quickTo(img, "y", { duration: 0.6, ease: "power3.out" });

    const moveImage = (e: MouseEvent) => {
      // Calculate mouse position relative to container
      const rect = container.getBoundingClientRect();
      xTo(e.clientX - rect.left);
      yTo(e.clientY - rect.top);
    };

    container.addEventListener("mousemove", moveImage);
    return () => container.removeEventListener("mousemove", moveImage);
  }, []);

  const handleMouseEnter = (src: string) => {
    setActiveImage(src);
    if (imageRef.current) {
      gsap.to(imageRef.current, { scale: 1, opacity: 1, duration: 0.5, ease: "power3.out" });
    }
  };

  const handleMouseLeave = () => {
    if (imageRef.current) {
      gsap.to(imageRef.current, { scale: 0.8, opacity: 0, duration: 0.4, ease: "power3.out" });
    }
  };

  return (
    <section ref={containerRef} style={{
      position: "relative",
      padding: "20vh 5vw",
      background: "#000000",
      color: "#FFFFFF",
      borderTop: "1px solid rgba(255,255,255,0.05)"
    }}>
      
      {/* Floating Image */}
      <img
        ref={imageRef}
        src={activeImage || LIST_ITEMS[0].image}
        alt="Preview"
        style={{
          position: "absolute",
          top: 0, left: 0,
          width: "35vw",
          minWidth: 400,
          aspectRatio: "3/4",
          objectFit: "cover",
          borderRadius: 16,
          pointerEvents: "none",
          zIndex: 2,
          willChange: "transform",
          boxShadow: "0 40px 100px -20px rgba(0,0,0,0.8)"
        }}
      />

      <div style={{ position: "relative", zIndex: 10, maxWidth: 1400, margin: "0 auto", pointerEvents: "none" }}>
        <h2 className="eyebrow" style={{ color: "#747574", marginBottom: "8vh" }}>
          Pick your entry
        </h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "2vh" }}>
          {LIST_ITEMS.map((item) => (
            <Link 
              key={item.id}
              href={`/${item.id}`}
              onMouseEnter={() => handleMouseEnter(item.image)}
              onMouseLeave={handleMouseLeave}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "4vh 0",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                textDecoration: "none",
                color: "#FFFFFF",
                position: "relative",
                pointerEvents: "auto"
              }}
              className="group"
            >
              <h3 
                style={{ 
                  fontFamily: "var(--font-dela)",
                  fontSize: "clamp(48px, 8vw, 140px)",
                  lineHeight: 0.9,
                  letterSpacing: "-0.02em",
                  transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), color 0.4s ease, -webkit-text-stroke 0.4s ease",
                  WebkitTextStroke: activeImage === item.image ? "1px rgba(255,255,255,0.7)" : "none",
                  color: activeImage === item.image ? "transparent" : "#FFFFFF"
                }}
                className="group-hover:translate-x-8"
              >
                {item.title}
              </h3>
              <span 
                style={{ 
                  fontSize: "clamp(14px, 1.2vw, 18px)", 
                  color: "#747574", 
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  transition: "color 0.3s"
                }}
                className="group-hover:text-white"
              >
                {item.tagline}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
