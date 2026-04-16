"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Lightweight WebGL hero background:
 *   • A slow-rotating wireframe icosahedron (the "abstract sphere")
 *   • A drifting particle field surrounding it
 * Designed to feel like atmosphere, not a centerpiece.
 */

function ParticleField({ count = 1200 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Spherical shell distribution — thicker near the centre
      const r = 4 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      siz[i] = Math.random() * 0.035 + 0.015;
    }
    return { positions: pos, sizes: siz };
  }, [count]);

  useFrame((_, delta) => {
    const p = pointsRef.current;
    if (!p) return;
    p.rotation.y += delta * 0.025;
    p.rotation.x += delta * 0.008;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={0.028}
        sizeAttenuation
        transparent
        opacity={0.75}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function WireSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    const m = meshRef.current;
    if (!m) return;
    m.rotation.y += delta * 0.08;
    m.rotation.x += delta * 0.04;
  });
  return (
    <mesh ref={meshRef} scale={2.4}>
      <icosahedronGeometry args={[1, 1]} />
      <meshBasicMaterial
        color="#e63946"
        wireframe
        transparent
        opacity={0.18}
      />
    </mesh>
  );
}

function Glow() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = meshRef.current;
    if (!m) return;
    const t = clock.getElapsedTime();
    m.scale.setScalar(2.6 + Math.sin(t * 0.6) * 0.08);
  });
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        color="#e63946"
        transparent
        opacity={0.035}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

export default function HeroParticles() {
  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 55 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
    >
      <Glow />
      <WireSphere />
      <ParticleField count={1100} />
    </Canvas>
  );
}
