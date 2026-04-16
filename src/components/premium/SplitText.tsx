"use client";
import { createElement, useEffect, useRef, type CSSProperties, type ElementType } from "react";
import { gsap } from "gsap";

type Props = {
  text: string;
  /** Delay before the reveal starts (seconds). */
  delay?: number;
  /** Stagger between characters (seconds). */
  stagger?: number;
  className?: string;
  style?: CSSProperties;
  as?: ElementType;
};

/**
 * Word-aware character reveal. Wraps each character in a masked span
 * and animates translateY from 100% → 0 with a staggered GSAP tween.
 * Uses `lang="en"` default spacing — words stay together, chars animate.
 */
export function SplitText({
  text, delay = 0, stagger = 0.025, className, style, as = "span",
}: Props) {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const chars = el.querySelectorAll<HTMLElement>("[data-char]");
    if (!chars.length) return;

    gsap.set(chars, { yPercent: 110 });
    const tween = gsap.to(chars, {
      yPercent: 0,
      duration: 0.9,
      ease: "expo.out",
      stagger,
      delay,
    });
    return () => { tween.kill(); };
  }, [delay, stagger, text]);

  const words = text.split(" ");

  const content = (
    <>
      {words.map((word, wi) => (
        <span key={wi} style={{ display: "inline-block", whiteSpace: "nowrap" }}>
          {Array.from(word).map((ch, ci) => (
            <span key={ci} className="char-mask">
              <span data-char>{ch}</span>
            </span>
          ))}
          {wi < words.length - 1 ? <span>&nbsp;</span> : null}
        </span>
      ))}
    </>
  );

  return createElement(as, { ref: rootRef, className, style }, content);
}
