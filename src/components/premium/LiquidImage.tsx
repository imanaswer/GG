"use client";
import React, { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform float uVelo;
  uniform float uTime;
  
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    
    // Smooth 3D Parallax Shift
    // uMouse is normalized 0.0 to 1.0. We map it to -0.5 to 0.5
    vec2 mouseOffset = (uMouse - 0.5) * 0.05; // 0.05 is the intensity of the parallax
    
    // Apply offset
    vec2 finalUv = uv + mouseOffset;
    
    vec4 color = texture2D(tDiffuse, finalUv);
    
    // Darken and tint slightly for cinematic effect
    color.rgb *= 0.7; // Darker
    
    gl_FragColor = color;
  }
`;

function Scene({ imageSrc }: { imageSrc: string }) {
  const mesh = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  // Mouse tracking
  const targetMouse = useRef(new THREE.Vector2(0.5, 0.5));
  const currentMouse = useRef(new THREE.Vector2(0.5, 0.5));
  const lastMouse = useRef(new THREE.Vector2(0.5, 0.5));
  const velocity = useRef(0);
  const targetVelocity = useRef(0);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(imageSrc, (tex) => {
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      setTexture(tex);
    });
  }, [imageSrc]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coordinates (0 to 1)
      targetMouse.current.x = e.clientX / window.innerWidth;
      targetMouse.current.y = 1.0 - (e.clientY / window.innerHeight);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const uniforms = useMemo(
    () => ({
      tDiffuse: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uVelo: { value: 0 },
      uTime: { value: 0 }
    }),
    []
  );

  useFrame((state, delta) => {
    if (!materialRef.current) return;

    // Smooth mouse follow
    currentMouse.current.lerp(targetMouse.current, 0.1);
    
    // Calculate velocity for distortion intensity
    const dist = currentMouse.current.distanceTo(lastMouse.current);
    targetVelocity.current = Math.min(dist * 50, 0.5); // Tune the max shift
    velocity.current = THREE.MathUtils.lerp(velocity.current, targetVelocity.current, 0.1);
    
    lastMouse.current.copy(currentMouse.current);

    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    materialRef.current.uniforms.uMouse.value.copy(currentMouse.current);
    materialRef.current.uniforms.uVelo.value = velocity.current;
    
    if (texture) {
      materialRef.current.uniforms.tDiffuse.value = texture;
      
      // Calculate aspect ratio cover, adding a slight zoom (e.g. 1.1) to account for the parallax panning
      // so we don't see the edges of the texture wrapping around.
      const texImage = texture.image as HTMLImageElement;
      const imageAspect = texImage.width / texImage.height;
      const screenAspect = viewport.width / viewport.height;
      const zoom = 1.1; 
      
      let scaleX = 1 * zoom;
      let scaleY = 1 * zoom;
      
      if (screenAspect > imageAspect) {
        scaleY = screenAspect / imageAspect;
      } else {
        scaleX = imageAspect / screenAspect;
      }
      
      materialRef.current.uniforms.uResolution.value.set(scaleX, scaleY);
    }
  });

  return (
    <mesh ref={mesh} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1, 32, 32]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export function LiquidImage({ src }: { src: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}>
      <Canvas camera={{ position: [0, 0, 1] }}>
        <Scene imageSrc={src} />
      </Canvas>
    </div>
  );
}
