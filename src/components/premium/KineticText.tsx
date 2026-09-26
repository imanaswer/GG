"use client";
import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import SplitType from "split-type";

type Props = {
  text: string;
  as?: React.ElementType | string;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
};

export function KineticText({ text, as = "div", className, delay = 0, style }: Props) {
  const Tag = as as "div"; // ponytail: typed as div so ref/style/className check; any intrinsic tag works at runtime
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!textRef.current) return;

    // Split text into chars
    const split = new SplitType(textRef.current, { types: "chars,words" });

    // Initial state: chars pushed down and invisible
    gsap.set(split.chars, { yPercent: 100, opacity: 0 });

    // Animate them up
    gsap.to(split.chars, {
      yPercent: 0,
      opacity: 1,
      duration: 1.2,
      stagger: 0.04,
      ease: "power4.out",
      delay: delay,
    });

    return () => {
      split.revert();
    };
  }, [text, delay]);

  return (
    <Tag
      ref={textRef}
      className={className}
      style={{
        clipPath: "inset(0 -0.5em -0.5em -0.5em)", // don't clip the descenders too much
        ...style
      }}
    >
      {text}
    </Tag>
  );
}
