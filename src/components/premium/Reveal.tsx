"use client";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type Props = {
  children: ReactNode;
  y?: number;
  delay?: number;
  duration?: number;
  start?: string;
  once?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * Scroll-triggered fade-up. Single element reveal; for staggered groups
 * wrap each child in its own Reveal or use Stagger.
 */
export function Reveal({
  children, y = 28, delay = 0, duration = 0.9,
  start = "top 85%", once = true, className, style,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.set(el, { opacity: 0, y });
    const tween = gsap.to(el, {
      opacity: 1,
      y: 0,
      duration,
      delay,
      ease: "expo.out",
      scrollTrigger: { trigger: el, start, once },
    });
    return () => { tween.scrollTrigger?.kill(); tween.kill(); };
  }, [y, delay, duration, start, once]);

  return <div ref={ref} className={className} style={style}>{children}</div>;
}

type StaggerProps = {
  children: ReactNode;
  selector?: string;
  y?: number;
  stagger?: number;
  duration?: number;
  start?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Staggered child reveal — children inside matching `selector` animate
 * one after another as the parent enters the viewport.
 */
export function Stagger({
  children, selector = "[data-stagger]", y = 32, stagger = 0.08,
  duration = 0.85, start = "top 80%", className, style,
}: StaggerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const targets = el.querySelectorAll<HTMLElement>(selector);
    if (!targets.length) return;
    gsap.set(targets, { opacity: 0, y });
    const tween = gsap.to(targets, {
      opacity: 1,
      y: 0,
      duration,
      stagger,
      ease: "expo.out",
      scrollTrigger: { trigger: el, start, once: true },
    });
    return () => { tween.scrollTrigger?.kill(); tween.kill(); };
  }, [selector, y, stagger, duration, start]);

  return <div ref={ref} className={className} style={style}>{children}</div>;
}
