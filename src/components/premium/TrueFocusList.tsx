"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TrueFocusItem {
  text: string;
  defaultColor: string;
  x: string;
}

interface TrueFocusListProps {
  items: TrueFocusItem[];
  className?: string;
  style?: React.CSSProperties;
}

export function TrueFocusList({ items, className, style }: TrueFocusListProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <h2 className={cn("display", className)} style={style}>
      {items.map((item, i) => {
        const isHovered = hoveredIndex === i;
        const isOtherHovered = hoveredIndex !== null && hoveredIndex !== i;

        return (
          <motion.span
            key={item.text}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            animate={{
              x: item.x,
              color: isHovered ? "#FFFFFF" : isOtherHovered ? "#222222" : item.defaultColor,
              filter: isOtherHovered ? "blur(12px)" : "blur(0px)",
              opacity: isOtherHovered ? 0.3 : 1,
              scale: isHovered ? 1.05 : isOtherHovered ? 0.95 : 1,
            }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} // smooth expo-like ease out
            style={{
              display: "block",
              transform: `translateX(${item.x})`, // initial transform fallback
              cursor: "pointer",
              willChange: "transform, filter, opacity, color"
            }}
          >
            {item.text}
          </motion.span>
        );
      })}
    </h2>
  );
}
