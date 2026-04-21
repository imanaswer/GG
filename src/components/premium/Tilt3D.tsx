"use client";
import { useRef, useCallback, type ReactNode, type CSSProperties } from "react";

type Props = {
  children: ReactNode;
  intensity?: number;
  scale?: number;
  glare?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function Tilt3D({
  children,
  intensity = 10,
  scale = 1.02,
  glare = true,
  className,
  style,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rotateX = (0.5 - y) * intensity;
      const rotateY = (x - 0.5) * intensity;
      el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale},${scale},${scale})`;
      if (glare && glareRef.current) {
        const angle = Math.atan2(y - 0.5, x - 0.5) * (180 / Math.PI) + 90;
        const dist = Math.hypot(x - 0.5, y - 0.5);
        glareRef.current.style.opacity = `${Math.min(dist * 0.7, 0.35)}`;
        glareRef.current.style.background = `linear-gradient(${angle}deg, rgba(255,255,255,0.25) 0%, transparent 80%)`;
      }
    },
    [intensity, scale, glare],
  );

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
    if (glare && glareRef.current) {
      glareRef.current.style.opacity = "0";
    }
  }, [glare]);

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={className}
      style={{
        transformStyle: "preserve-3d",
        transition: "transform 0.15s ease-out",
        willChange: "transform",
        position: "relative",
        ...style,
      }}
    >
      {children}
      {glare && (
        <div
          ref={glareRef}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            pointerEvents: "none",
            opacity: 0,
            transition: "opacity 0.2s ease-out",
            zIndex: 2,
          }}
        />
      )}
    </div>
  );
}
