import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';

/**
 * AI-themed hero visual — solid 3D shapes, no glow, no gradients.
 *
 * A faceted icosahedron in the centre with a wireframe outer shell, plus
 * five smaller satellite spheres orbiting it like neural nodes. Every
 * surface is rendered with matte standard materials lit by neutral white
 * lights — no emissive glow, no coloured rim lights, no sparkle dust.
 * The result reads as a 3D plastic toy of an AI core, which fits the
 * "no glow ting / 3D button" aesthetic the rest of the page uses.
 *
 * Theme-aware: the core + nodes pick a darker hue in light mode and a
 * lighter hue in dark mode so the silhouette stays readable against the
 * page background.
 */

interface HeroOrbProps {
  dark: boolean;
}

const NODE_COUNT = 5;

function OrbitingNodes({ dark }: HeroOrbProps) {
  const group = useRef<THREE.Group>(null);
  const nodes = useMemo(() => {
    return Array.from({ length: NODE_COUNT }).map((_, i) => {
      const phase = (i / NODE_COUNT) * Math.PI * 2;
      const radius = 1.9 + (i % 2 === 0 ? 0 : 0.3);
      const speed = 0.4 + i * 0.08;
      const yOffset = (i - NODE_COUNT / 2) * 0.18;
      // Solid palette colours — no neon, no emissive. Light mode uses
      // saturated darker tones (readable on white), dark mode uses
      // pastel tones (readable on slate-950).
      const palette = dark
        ? ['#c4b5fd', '#67e8f9', '#f9a8d4', '#86efac', '#fcd34d']
        : ['#7c3aed', '#0ea5e9', '#db2777', '#10b981', '#d97706'];
      return { phase, radius, speed, yOffset, color: palette[i] };
    });
  }, [dark]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.children.forEach((child, i) => {
      const n = nodes[i];
      const angle = n.phase + t * n.speed;
      child.position.set(
        Math.cos(angle) * n.radius,
        n.yOffset + Math.sin(angle * 1.3) * 0.15,
        Math.sin(angle) * n.radius,
      );
    });
  });

  return (
    <group ref={group}>
      {nodes.map((n, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.16, 24, 16]} />
          <meshStandardMaterial
            color={n.color}
            metalness={0}
            roughness={0.5}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function Core({ dark }: HeroOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x += dt * 0.15;
    meshRef.current.rotation.y += dt * 0.22;
  });

  const coreColour = dark ? '#a78bfa' : '#7c3aed';
  const wireColour = dark ? '#e9d5ff' : '#5b21b6';

  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.6}>
      {/* Solid inner core — matte plastic look, no emissive */}
      <mesh>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshStandardMaterial
          color={coreColour}
          metalness={0}
          roughness={0.55}
          toneMapped={false}
        />
      </mesh>
      {/* Wireframe outer cage — purely geometric, no transparency tricks */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.22, 1]} />
        <meshBasicMaterial
          color={wireColour}
          wireframe
          toneMapped={false}
        />
      </mesh>
    </Float>
  );
}

export function HeroOrb({ dark }: HeroOrbProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.4, 5.5], fov: 45 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.NoToneMapping,
      }}
      style={{ background: 'transparent' }}
    >
      {/* Neutral 3-point lighting — no coloured rim lights, so the
          materials show their authored colours rather than picking up
          a tint and reading as "glow". */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 3]} intensity={0.9} color="#ffffff" />
      <directionalLight position={[-3, -2, -2]} intensity={0.45} color="#ffffff" />

      <Core dark={dark} />
      <OrbitingNodes dark={dark} />
    </Canvas>
  );
}
