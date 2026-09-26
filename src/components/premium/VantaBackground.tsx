"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
// @ts-ignore
import HALO from "vanta/dist/vanta.halo.min";

export function VantaBackground() {
  const [vantaEffect, setVantaEffect] = useState<any>(null);
  const myRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!vantaEffect && myRef.current) {
      // Vanta Halo effect matched to the new color palette
      setVantaEffect(
        HALO({
          el: myRef.current,
          THREE: THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          baseColor: 0x180D0D, // Coffee Bean
          backgroundColor: 0x000000, // Black
          amplitudeFactor: 1.5,
          size: 1.5,
        })
      );
    }
    return () => {
      if (vantaEffect) vantaEffect.destroy();
    };
  }, [vantaEffect]);

  return (
    <div
      ref={myRef}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
      }}
    />
  );
}
