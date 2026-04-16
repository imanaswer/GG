"use client";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type Props = {
  children: ReactNode;
  /** Pixels of vertical translate across the scroll range. Positive = moves up faster. */
  speed?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * ScrollTrigger-based parallax that moves its child vertically as it
 * passes through the viewport. `speed = 80` ≈ subtle, 160 ≈ noticeable.
 */
export function Parallax({ children, speed = 80, className, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse) return; // skip on touch — choppy without lenis

    const tween = gsap.fromTo(
      el,
      { y: speed },
      {
        y: -speed,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      },
    );
    return () => { tween.scrollTrigger?.kill(); tween.kill(); };
  }, [speed]);

  return <div ref={ref} className={className} style={style}>{children}</div>;
}
