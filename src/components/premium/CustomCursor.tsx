"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { usePathname } from "next/navigation";
import { ArrowDown } from "lucide-react";

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const cursor = cursorRef.current;
    const text = textRef.current;
    if (!cursor || !text) return;

    // Fast follow settings
    gsap.set(cursor, { xPercent: -50, yPercent: -50 });

    const xTo = gsap.quickTo(cursor, "x", { duration: 0.15, ease: "power3" });
    const yTo = gsap.quickTo(cursor, "y", { duration: 0.15, ease: "power3" });

    let hasMoved = false;
    let isHovering = false;
    const updateCursorDefault = () => {
      if (isHovering) return;

      // Small dot cursor
      gsap.to(cursor, {
        width: 12,
        height: 12,
        background: "#A0A0A0",
        border: "1px solid rgba(0,0,0,0.2)",
        boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
        duration: 0.4,
        ease: "power2.out"
      });
    };

    const handleScroll = () => {
      // Just keep updating cursor default if needed, though without the scroll state it's static
      updateCursorDefault();
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    const moveCursor = (e: MouseEvent) => {
      // Unhide cursor on first move
      if (!hasMoved) {
        hasMoved = true;
        gsap.to(cursor, { opacity: 1, duration: 0.3 });
      }
      xTo(e.clientX);
      yTo(e.clientY);
    };

    window.addEventListener("mousemove", moveCursor);

    // Handle interactive elements
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      const clickable = target.closest("a:not([data-cursor-ignore]), button:not([data-cursor-ignore]), [role='button']:not([data-cursor-ignore]), input, textarea, select");
      const magnetic = target.closest("[data-magnetic]");
      const viewText = target.closest("[data-cursor-text]");

      if (viewText || clickable || magnetic) {
        isHovering = true;
      }

      if (viewText) {
        const customText = viewText.getAttribute("data-cursor-text") || "View";
        text.innerText = customText;
        gsap.to(cursor, {
          width: 80,
          height: 80,
          background: "rgba(255,255,255,0.9)",
          border: "none",
          color: "#000",
          duration: 0.3,
          ease: "power2.out"
        });
        gsap.to(text, { opacity: 1, duration: 0.2, scale: 1 });
      } else if (clickable || magnetic) {
        gsap.to(cursor, {
          width: 64,
          height: 64,
          background: "#FFFFFF",
          backdropFilter: "none",
          border: "none",
          duration: 0.3,
          ease: "power2.out"
        });
        gsap.to(text, { opacity: 0, duration: 0.2, scale: 0 });
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickable = target.closest("a:not([data-cursor-ignore]), button:not([data-cursor-ignore]), [role='button']:not([data-cursor-ignore]), input, textarea, select, [data-magnetic], [data-cursor-text]");
      
      if (clickable) {
        isHovering = false;
        gsap.to(text, { opacity: 0, duration: 0.2, scale: 0 });
        updateCursorDefault();
      }
    };

    const handleMouseLeave = () => {
      gsap.to(cursor, { opacity: 0, duration: 0.2 });
    };

    const handleMouseEnter = () => {
      if (hasMoved) {
        gsap.to(cursor, { opacity: 1, duration: 0.2 });
      }
    };

    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);
    
    // Initialize default state correctly right away
    updateCursorDefault();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", moveCursor);
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [pathname, mounted]);

  if (!mounted || pathname?.startsWith("/admin")) return null;

  return (
    <>
      <div
        ref={cursorRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 12,
          height: 12,
          background: "#A0A0A0",
          border: "1px solid rgba(0,0,0,0.2)",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 999999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0,
          willChange: "transform",
          boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
          mixBlendMode: "difference",
        }}
      >
        <div
          ref={textRef}
          style={{
            position: "absolute",
            opacity: 0,
            scale: 0,
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            whiteSpace: "nowrap"
          }}
        >
          View
        </div>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (pointer: fine) {
          body { cursor: none !important; }
          a, button, [role="button"], input, select, textarea { cursor: none !important; }
        }
      `}</style>
    </>
  );
}
