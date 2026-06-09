/**
 * InteriorFurniture - 3D assets for shop interior decoration
 * Enhanced with better textures and designs
 */

import { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { clone as cloneWithSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { resolvePublicAssetUrl } from './assetPath';

// Asset paths
const ASSETS = {
  atm: resolvePublicAssetUrl('assets/dassets/interior/ATM.glb'),
  vendingMachine: resolvePublicAssetUrl('assets/dassets/interior/Vending Machine.glb'),
  butterRobot: resolvePublicAssetUrl('assets/dassets/interior/Butter Robot.glb'),
  toyRobot: resolvePublicAssetUrl('assets/dassets/interior/toy robot.glb'),
};

const CASHIER_MODEL = resolvePublicAssetUrl('assets/dassets/avatar/Business Man.glb');

// Procedural texture generators
function createWoodTexture(darker = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  
  // Base color
  ctx.fillStyle = darker ? '#4a3728' : '#8b6f47';
  ctx.fillRect(0, 0, 512, 512);
  
  // Wood grain
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 100; i++) {
    ctx.strokeStyle = darker ? '#2d1f16' : '#5c4a35';
    ctx.lineWidth = 1 + Math.random() * 3;
    ctx.beginPath();
    const x = Math.random() * 512;
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(
      x + Math.random() * 40 - 20, 170,
      x + Math.random() * 40 - 20, 340,
      x + Math.random() * 20 - 10, 512
    );
    ctx.stroke();
  }
  
  // Fine grain
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 200; i++) {
    ctx.strokeStyle = darker ? '#1a120e' : '#4a3d2e';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    const x = Math.random() * 512;
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.random() * 10 - 5, 512);
    ctx.stroke();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createFabricTexture(color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);
  
  // Fabric weave pattern
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#000000';
  for (let i = 0; i < 256; i += 4) {
    ctx.fillRect(i, 0, 1, 256);
    ctx.fillRect(0, i, 256, 1);
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createMarbleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  
  // Base cream color
  ctx.fillStyle = '#f5f0e8';
  ctx.fillRect(0, 0, 512, 512);
  
  // Marble veins
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = '#c9b8a0';
  ctx.lineWidth = 2;
  
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    let x = Math.random() * 512;
    let y = Math.random() * 512;
    ctx.moveTo(x, y);
    
    for (let j = 0; j < 10; j++) {
      x += Math.random() * 100 - 50;
      y += Math.random() * 100 - 50;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  
  // Subtle noise
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 1000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

interface InteriorAssetProps {
  modelPath: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  targetHeight?: number;
  name: string;
}

function InteriorAsset({
  modelPath,
  position,
  rotation = [0, 0, 0],
  scale = 1,
  targetHeight,
}: InteriorAssetProps) {
  const { scene } = useGLTF(modelPath);

  const clone = useMemo(() => {
    const c = scene.clone();
    c.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).castShadow = true;
        (child as THREE.Mesh).receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  const { finalScale, yOffset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clone);
    let s = scale;
    if (targetHeight && targetHeight > 0) {
      const rawHeight = box.max.y - box.min.y;
      if (rawHeight > 0) {
        s = targetHeight / rawHeight;
      }
    }
    return { finalScale: s, yOffset: -box.min.y * s };
  }, [clone, scale, targetHeight]);


  return (
    <group position={[position[0], position[1] + yOffset, position[2]]} rotation={rotation} scale={finalScale}>
      <primitive object={clone} />
    </group>
  );
}

// Preload assets
useGLTF.preload(ASSETS.atm);
useGLTF.preload(ASSETS.vendingMachine);
useGLTF.preload(ASSETS.butterRobot);
useGLTF.preload(ASSETS.toyRobot);
useGLTF.preload(CASHIER_MODEL);

// Furniture items
function ATM({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return <InteriorAsset name="ATM" modelPath={ASSETS.atm} position={position} rotation={rotation} targetHeight={2.2} />;
}

function VendingMachine({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return <InteriorAsset name="VendingMachine" modelPath={ASSETS.vendingMachine} position={position} rotation={rotation} targetHeight={2.4} />;
}

function ButterRobot({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return <InteriorAsset name="ButterRobot" modelPath={ASSETS.butterRobot} position={position} rotation={rotation} targetHeight={0.8} />;
}

function ToyRobot({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return <InteriorAsset name="ToyRobot" modelPath={ASSETS.toyRobot} position={position} rotation={rotation} targetHeight={1.2} />;
}

// ============================================================================
// CASHIER NPC - Standing at counter
// ============================================================================
function CashierNPC({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(CASHIER_MODEL);

  const clone = useMemo(() => {
    const c = cloneWithSkeleton(scene);
    c.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).castShadow = true;
        (child as THREE.Mesh).frustumCulled = false;
      }
    });
    return c;
  }, [scene]);

  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    const idleAction = actions['CharacterArmature|Idle'] || actions['Idle'] || Object.values(actions)[0];
    if (idleAction) {
      idleAction.reset().play();
    }
  }, [actions]);

  return (
    <group ref={group} position={position} rotation={rotation} scale={0.7}>
      <primitive object={clone} />
    </group>
  );
}

// ============================================================================
// ENHANCED DECORATIVE ITEMS - With textures and better designs
// ============================================================================

function Plant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const potTexture = useMemo(() => createWoodTexture(true), []);
  
  return (
    <group position={position} scale={scale}>
      {/* Decorative pot with rim - terracotta style */}
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.18, 0.3, 16]} />
        <meshStandardMaterial color="#a65e2e" roughness={0.8} map={potTexture} />
      </mesh>
      <mesh position={[0, 0.31, 0]} castShadow>
        <torusGeometry args={[0.22, 0.025, 8, 16]} />
        <meshStandardMaterial color="#8b4a20" roughness={0.7} map={potTexture} />
      </mesh>
      {/* Soil with texture */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.02, 16]} />
        <meshStandardMaterial color="#3d2b1f" roughness={1} />
      </mesh>
      {/* Main stem */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.04, 0.4, 8]} />
        <meshStandardMaterial color="#2d5a1e" roughness={0.8} />
      </mesh>
      {/* Leaf clusters - more detailed */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.35, 12, 10]} />
        <meshStandardMaterial color="#228B22" roughness={0.7} />
      </mesh>
      <mesh position={[0.18, 0.95, 0.1]} castShadow>
        <sphereGeometry args={[0.22, 10, 8]} />
        <meshStandardMaterial color="#2ecc71" roughness={0.7} />
      </mesh>
      <mesh position={[-0.15, 0.9, -0.1]} castShadow>
        <sphereGeometry args={[0.24, 10, 8]} />
        <meshStandardMaterial color="#27ae60" roughness={0.7} />
      </mesh>
      <mesh position={[0.1, 1.05, -0.15]} castShadow>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial color="#1e8449" roughness={0.7} />
      </mesh>
      {/* Small leaves */}
      <mesh position={[0.25, 0.75, 0.05]} castShadow>
        <sphereGeometry args={[0.1, 6, 6]} />
        <meshStandardMaterial color="#2ecc71" roughness={0.7} />
      </mesh>
    </group>
  );
}

function TrashCan({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Body - brushed metal look */}
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.18, 0.7, 16]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Rim */}
      <mesh position={[0, 0.71, 0]} castShadow>
        <torusGeometry args={[0.22, 0.02, 6, 16]} />
        <meshStandardMaterial color="#666" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Lid */}
      <mesh position={[0, 0.74, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.04, 16]} />
        <meshStandardMaterial color="#555" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Foot pedal */}
      <mesh position={[0.15, 0.05, 0.15]} castShadow>
        <boxGeometry args={[0.15, 0.06, 0.1]} />
        <meshStandardMaterial color="#333" metalness={0.6} />
      </mesh>
    </group>
  );
}

function Bench({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  const woodTexture = useMemo(() => createWoodTexture(), []);
  const fabricTexture = useMemo(() => createFabricTexture('#c9a84c'), []);
  
  return (
    <group position={position} rotation={rotation}>
      {/* Seat frame */}
      <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.08, 0.5]} />
        <meshStandardMaterial map={woodTexture} roughness={0.7} />
      </mesh>
      {/* Padded cushion with fabric texture */}
      <mesh position={[0, 0.44, 0]} castShadow>
        <boxGeometry args={[1.4, 0.06, 0.44]} />
        <meshStandardMaterial map={fabricTexture} roughness={0.9} />
      </mesh>
      {/* Metal legs - decorative curved design */}
      {[[-0.65, 0.19, -0.2], [0.65, 0.19, -0.2], [-0.65, 0.19, 0.2], [0.65, 0.19, 0.2]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.025, 0.02, 0.38, 8]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      {/* Cross brace */}
      <mesh position={[0, 0.08, -0.2]} castShadow>
        <boxGeometry args={[1.2, 0.03, 0.03]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.08, 0.2]} castShadow>
        <boxGeometry args={[1.2, 0.03, 0.03]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.8} />
      </mesh>
      {/* Backrest with wood texture */}
      <mesh position={[0, 0.65, -0.22]} castShadow>
        <boxGeometry args={[1.5, 0.4, 0.06]} />
        <meshStandardMaterial map={woodTexture} roughness={0.7} />
      </mesh>
      {/* Backrest cushion */}
      <mesh position={[0, 0.65, -0.19]} castShadow>
        <boxGeometry args={[1.4, 0.35, 0.04]} />
        <meshStandardMaterial map={fabricTexture} roughness={0.9} />
      </mesh>
      {/* Backrest supports */}
      {[-0.6, 0.6].map((x, i) => (
        <mesh key={i} position={[x, 0.5, -0.25]} castShadow>
          <boxGeometry args={[0.04, 0.5, 0.04]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function BookShelf({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  const woodTexture = useMemo(() => createWoodTexture(true), []);
  const bookColors = ['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#1abc9c', '#d35400', '#2c3e50'];
  
  return (
    <group position={position} rotation={rotation}>
      {/* Shelf frame with wood texture */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.2, 1.8, 0.35]} />
        <meshStandardMaterial map={woodTexture} roughness={0.8} />
      </mesh>
      {/* Shelves (3 levels) */}
      {[-0.5, 0, 0.5].map((sy, si) => (
        <group key={`shelf-${si}`}>
          <mesh position={[0, sy, 0.02]} castShadow>
            <boxGeometry args={[1.1, 0.04, 0.32]} />
            <meshStandardMaterial map={woodTexture} color="#6b4e3d" />
          </mesh>
          {/* Books on each shelf */}
          {Array.from({ length: 4 }).map((_, bi) => (
            <mesh key={`book-${si}-${bi}`} position={[-0.35 + bi * 0.22, sy + 0.14, 0.02]} castShadow>
              <boxGeometry args={[0.08, 0.22 + Math.random() * 0.06, 0.2]} />
              <meshStandardMaterial color={bookColors[(si * 4 + bi) % bookColors.length]} roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Decorative side panels */}
      <mesh position={[-0.58, 0, 0]} castShadow>
        <boxGeometry args={[0.06, 1.7, 0.3]} />
        <meshStandardMaterial map={woodTexture} color="#4a3728" />
      </mesh>
      <mesh position={[0.58, 0, 0]} castShadow>
        <boxGeometry args={[0.06, 1.7, 0.3]} />
        <meshStandardMaterial map={woodTexture} color="#4a3728" />
      </mesh>
    </group>
  );
}

function WallClock({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Clock body */}
      <mesh castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.06, 32]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Clock face */}
      <mesh position={[0, 0, 0.04]}>
        <cylinderGeometry args={[0.35, 0.35, 0.01, 32]} />
        <meshStandardMaterial color="#f5f5f0" />
      </mesh>
      {/* Gold rim */}
      <mesh>
        <torusGeometry args={[0.4, 0.025, 8, 32]} />
        <meshStandardMaterial color="#c9a84c" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Hour markers */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const x = Math.sin(angle) * 0.28;
        const y = Math.cos(angle) * 0.28;
        return (
          <mesh key={i} position={[x, y, 0.05]}>
            <boxGeometry args={[0.02, 0.04, 0.01]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        );
      })}
      {/* Hour hand */}
      <mesh position={[0, 0.08, 0.05]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.025, 0.18, 0.01]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Minute hand */}
      <mesh position={[0.05, 0.1, 0.05]} rotation={[0, 0, -1.2]}>
        <boxGeometry args={[0.02, 0.25, 0.01]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Center dot */}
      <mesh position={[0, 0, 0.055]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#c9a84c" metalness={0.8} />
      </mesh>
    </group>
  );
}

function FramedArt({ position, rotation = [0, 0, 0], color = "#4169E1" }: { position: [number, number, number]; rotation?: [number, number, number]; color?: string }) {
  const woodTexture = useMemo(() => createWoodTexture(true), []);
  
  return (
    <group position={position} rotation={rotation}>
      {/* Frame with texture */}
      <mesh castShadow>
        <boxGeometry args={[0.95, 1.3, 0.06]} />
        <meshStandardMaterial map={woodTexture} roughness={0.7} />
      </mesh>
      {/* Mat border */}
      <mesh position={[0, 0, 0.025]}>
        <boxGeometry args={[0.8, 1.15, 0.015]} />
        <meshStandardMaterial color="#f5f5f0" />
      </mesh>
      {/* Art */}
      <mesh position={[0, 0, 0.035]}>
        <boxGeometry args={[0.65, 1.0, 0.01]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {/* Frame detail - inner bevel */}
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[0.82, 1.17, 0.005]} />
        <meshStandardMaterial color="#c9a84c" metalness={0.6} />
      </mesh>
    </group>
  );
}

// ============================================================================
// ENHANCED TABLE - Modern design with marble top
// ============================================================================
function ModernTable({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  const woodTexture = useMemo(() => createWoodTexture(), []);

  return (
    <group position={position} rotation={rotation}>
      {/* Rectangular tabletop - dark walnut */}
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.05, 0.9]} />
        <meshStandardMaterial map={woodTexture} color="#5c3a21" roughness={0.5} metalness={0.05} />
      </mesh>
      {/* Edge banding - gold trim */}
      <mesh position={[0, 0.72, 0]} castShadow>
        <boxGeometry args={[1.64, 0.02, 0.94]} />
        <meshStandardMaterial color="#c9a84c" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Apron - connects top to legs */}
      <mesh position={[0, 0.67, 0]} castShadow>
        <boxGeometry args={[1.5, 0.06, 0.8]} />
        <meshStandardMaterial map={woodTexture} color="#4a3020" roughness={0.6} />
      </mesh>
      {/* 4 tapered legs */}
      {[[-0.68, 0.33, -0.33], [0.68, 0.33, -0.33], [-0.68, 0.33, 0.33], [0.68, 0.33, 0.33]].map(
        ([lx, ly, lz], i) => (
          <mesh key={`tleg-${i}`} position={[lx, ly, lz]} castShadow>
            <cylinderGeometry args={[0.035, 0.025, 0.64, 8]} />
            <meshStandardMaterial color="#3d2b1f" roughness={0.7} />
          </mesh>
        ),
      )}
      {/* Gold leg caps */}
      {[[-0.68, 0.01, -0.33], [0.68, 0.01, -0.33], [-0.68, 0.01, 0.33], [0.68, 0.01, 0.33]].map(
        ([lx, ly, lz], i) => (
          <mesh key={`tcap-${i}`} position={[lx, ly, lz]}>
            <cylinderGeometry args={[0.03, 0.03, 0.02, 8]} />
            <meshStandardMaterial color="#c9a84c" metalness={0.8} roughness={0.2} />
          </mesh>
        ),
      )}
      {/* Stretcher bar between legs */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[1.2, 0.025, 0.025]} />
        <meshStandardMaterial color="#3d2b1f" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[0.025, 0.025, 0.55]} />
        <meshStandardMaterial color="#3d2b1f" roughness={0.7} />
      </mesh>
    </group>
  );
}

// ============================================================================
// ENHANCED CHAIR - Modern design with upholstery
// ============================================================================
function ModernChair({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  const fabricTexture = useMemo(() => createFabricTexture('#8B4513'), []);
  
  return (
    <group position={position} rotation={rotation}>
      {/* Cushioned seat */}
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.08, 16]} />
        <meshStandardMaterial map={fabricTexture} roughness={0.8} />
      </mesh>
      {/* Seat frame */}
      <mesh position={[0, 0.37, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.26, 0.04, 16]} />
        <meshStandardMaterial color="#3d2b1f" roughness={0.7} />
      </mesh>
      {/* 4 slim legs */}
      {[[-0.15, 0.18, -0.15], [0.15, 0.18, -0.15], [-0.15, 0.18, 0.15], [0.15, 0.18, 0.15]].map(
        ([lx, ly, lz], j) => (
          <mesh key={j} position={[lx, ly, lz]} castShadow>
            <cylinderGeometry args={[0.02, 0.015, 0.36, 8]} />
            <meshStandardMaterial color="#3d2b1f" roughness={0.7} />
          </mesh>
        ),
      )}
      {/* Leg cross brace */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[0.3, 0.02, 0.02]} />
        <meshStandardMaterial color="#3d2b1f" />
      </mesh>
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[0.02, 0.02, 0.3]} />
        <meshStandardMaterial color="#3d2b1f" />
      </mesh>
      {/* Curved backrest frame */}
      <mesh position={[0, 0.65, -0.18]} castShadow>
        <boxGeometry args={[0.4, 0.42, 0.04]} />
        <meshStandardMaterial color="#3d2b1f" roughness={0.7} />
      </mesh>
      {/* Backrest cushion */}
      <mesh position={[0, 0.65, -0.16]} castShadow>
        <boxGeometry args={[0.36, 0.38, 0.04]} />
        <meshStandardMaterial map={fabricTexture} roughness={0.8} />
      </mesh>
      {/* Backrest detail - tufted button effect */}
      <mesh position={[0, 0.75, -0.14]} castShadow>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#6b4423" />
      </mesh>
    </group>
  );
}

// ============================================================================
// SHOP TV – flat screen displaying shop image (futuristic kid-friendly CTA)
// ============================================================================

/** Draws the futuristic CTA screen onto a canvas texture */
function createTVScreenTexture(frame: number): THREE.CanvasTexture {
  const W = 512, H = 320;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // --- Animated gradient background ---
  const t = frame * 0.015;
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, `hsl(${(260 + Math.sin(t) * 20) | 0}, 80%, 18%)`);
  grad.addColorStop(0.5, `hsl(${(220 + Math.cos(t * 0.7) * 15) | 0}, 75%, 22%)`);
  grad.addColorStop(1, `hsl(${(280 + Math.sin(t * 1.3) * 20) | 0}, 70%, 15%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // --- Scan-line overlay ---
  ctx.fillStyle = 'rgba(255,255,255,0.015)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);

  // --- Glowing corner brackets ---
  const bLen = 40, bW = 3, pad = 18;
  const glow = `rgba(100,200,255,${0.5 + Math.sin(t * 2) * 0.3})`;
  ctx.strokeStyle = glow; ctx.lineWidth = bW; ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 10;
  // top-left
  ctx.beginPath(); ctx.moveTo(pad, pad + bLen); ctx.lineTo(pad, pad); ctx.lineTo(pad + bLen, pad); ctx.stroke();
  // top-right
  ctx.beginPath(); ctx.moveTo(W - pad - bLen, pad); ctx.lineTo(W - pad, pad); ctx.lineTo(W - pad, pad + bLen); ctx.stroke();
  // bottom-left
  ctx.beginPath(); ctx.moveTo(pad, H - pad - bLen); ctx.lineTo(pad, H - pad); ctx.lineTo(pad + bLen, H - pad); ctx.stroke();
  // bottom-right
  ctx.beginPath(); ctx.moveTo(W - pad - bLen, H - pad); ctx.lineTo(W - pad, H - pad); ctx.lineTo(W - pad, H - pad - bLen); ctx.stroke();
  ctx.shadowBlur = 0;

  // --- Star / sparkle icon ---
  const cx = W / 2, starY = 85;
  const pulse = 1 + Math.sin(t * 3) * 0.08;
  ctx.save();
  ctx.translate(cx, starY); ctx.scale(pulse, pulse);
  // Outer glow
  ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 25;
  ctx.fillStyle = '#fbbf24';
  drawStar(ctx, 0, 0, 5, 28, 12);
  ctx.fill();
  // Inner white
  ctx.shadowBlur = 0; ctx.fillStyle = '#fff';
  drawStar(ctx, 0, 0, 5, 14, 6);
  ctx.fill();
  ctx.restore();

  // --- Main text ---
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // Shadow + glow
  ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 18;
  ctx.font = 'bold 38px "Segoe UI", "Arial Rounded MT Bold", Verdana, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Add Your Poster!', cx, 155);
  ctx.shadowBlur = 0;
  // Outline effect – draw twice for thickness
  ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3;
  ctx.strokeText('Add Your Poster!', cx, 155);
  ctx.fillStyle = '#fff';
  ctx.fillText('Add Your Poster!', cx, 155);

  // --- Sub text ---
  ctx.font = 'bold 20px "Segoe UI", Verdana, sans-serif';
  ctx.fillStyle = '#93c5fd';
  ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 8;
  ctx.fillText('Tap to promote your shop!', cx, 200);
  ctx.shadowBlur = 0;

  // --- Animated bottom bar ---
  const barW = 180, barH = 28, barX = cx - barW / 2, barY = 245;
  const barGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
  const hue1 = (frame * 2) % 360;
  barGrad.addColorStop(0, `hsl(${hue1}, 80%, 55%)`);
  barGrad.addColorStop(0.5, `hsl(${(hue1 + 60) % 360}, 80%, 60%)`);
  barGrad.addColorStop(1, `hsl(${(hue1 + 120) % 360}, 80%, 55%)`);
  ctx.fillStyle = barGrad;
  roundRect(ctx, barX, barY, barW, barH, 14);
  ctx.fill();
  ctx.font = 'bold 15px "Segoe UI", Verdana, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('TAP HERE', cx, barY + barH / 2 + 1);

  // --- Floating particles ---
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  for (let i = 0; i < 12; i++) {
    const px = ((i * 137 + frame * 0.5) % W);
    const py = ((i * 89 + frame * 0.3 + Math.sin(frame * 0.02 + i) * 30) % H);
    const r = 1 + (i % 3);
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Draw a star path */
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerR: number, innerR: number) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (Math.PI / 2 * 3) + (i * Math.PI / spikes);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Draw a rounded rectangle path */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function ShopTV({
  position,
  rotation = [0, 0, 0],
  imageUrl,
  onClick,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  imageUrl?: string;
  onClick?: () => void;
}) {
  const [imgTexture, setImgTexture] = useState<THREE.Texture | null>(null);
  const [hovered, setHovered] = useState(false);
  const glowRef = useRef<THREE.PointLight>(null);
  const screenRef = useRef<THREE.Mesh>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!imageUrl) return;
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(imageUrl, (tex) => {
      if (cancelled) { tex.dispose(); return; }
      tex.colorSpace = THREE.SRGBColorSpace;
      setImgTexture(tex);
    }, undefined, () => {});
    return () => { cancelled = true; };
  }, [imageUrl]);

  // Animate CTA screen + glow
  useFrame(({ clock }) => {
    if (glowRef.current) {
      glowRef.current.intensity = 0.5 + Math.sin(clock.getElapsedTime() * 2) * 0.3;
    }
    // Update CTA canvas texture every ~3 frames for performance
    if (!imgTexture && screenRef.current) {
      frameRef.current++;
      if (frameRef.current % 3 === 0) {
        const mat = (screenRef.current as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat.map) mat.map.dispose();
        mat.map = createTVScreenTexture(frameRef.current);
        mat.needsUpdate = true;
      }
    }
  });

  // Initial CTA texture
  const initialCTA = useMemo(() => createTVScreenTexture(0), []);

  return (
    <group position={position} rotation={rotation}>
      {/* Ceiling mount rod */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1.0, 6]} />
        <meshStandardMaterial color="#333" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Mount plate on ceiling */}
      <mesh position={[0, 1.45, 0]} castShadow>
        <boxGeometry args={[0.4, 0.04, 0.3]} />
        <meshStandardMaterial color="#222" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Swivel joint */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.15, 0.1, 0.15]} />
        <meshStandardMaterial color="#444" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* TV frame - sleek dark bezel with subtle blue edge */}
      <mesh castShadow>
        <boxGeometry args={[2.2, 2.2, 0.08]} />
        <meshStandardMaterial color="#0a0a12" metalness={0.6} roughness={0.25} />
      </mesh>
      {/* Thin neon edge trim */}
      <mesh position={[0, 0, 0.042]}>
        <planeGeometry args={[2.1, 2.1]} />
        <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={0.15} transparent opacity={0.3} />
      </mesh>
      {/* Clickable screen */}
      <mesh
        ref={screenRef}
        position={[0, 0, 0.046]}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <planeGeometry args={[2.0, 2.0]} />
        {imgTexture ? (
          <meshBasicMaterial map={imgTexture} />
        ) : (
          <meshBasicMaterial map={initialCTA} />
        )}
      </mesh>
      {/* Screen glow */}
      <pointLight ref={glowRef} position={[0, 0, 0.4]} intensity={0.5} distance={3} color={hovered ? '#a78bfa' : '#6366f1'} />
    </group>
  );
}

// ============================================================================
// WALL POSTER FRAME – clickable poster slot on the right wall
// ============================================================================

function createEmptyFrameTexture(): THREE.CanvasTexture {
  const W = 512, H = 700;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Dark background with slight gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, 'rgba(40, 30, 60, 0.85)');
  bg.addColorStop(1, 'rgba(25, 20, 40, 0.85)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Dotted border rectangle — thick and bright
  ctx.setLineDash([16, 10]);
  ctx.strokeStyle = 'rgba(180, 160, 255, 0.7)';
  ctx.lineWidth = 5;
  ctx.strokeRect(24, 24, W - 48, H - 48);

  // Inner dotted rectangle
  ctx.strokeStyle = 'rgba(180, 160, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  // "+" icon in center — large
  ctx.setLineDash([]);
  const cx = W / 2, cy = H / 2 - 30;
  // Circle behind +
  ctx.beginPath();
  ctx.arc(cx, cy, 45, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(140, 120, 255, 0.25)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(180, 160, 255, 0.6)';
  ctx.lineWidth = 3;
  ctx.stroke();
  // + lines
  ctx.strokeStyle = 'rgba(220, 210, 255, 0.8)';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(cx - 22, cy); ctx.lineTo(cx + 22, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 22); ctx.lineTo(cx, cy + 22); ctx.stroke();

  // "Tap to Add Poster" text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillStyle = 'rgba(220, 210, 255, 0.7)';
  ctx.fillText('Tap to Add', cx, cy + 70);
  ctx.font = 'bold 26px sans-serif';
  ctx.fillStyle = 'rgba(180, 160, 255, 0.5)';
  ctx.fillText('Poster', cx, cy + 105);

  // Corner decorations
  const cornerSize = 20;
  ctx.strokeStyle = 'rgba(200, 180, 255, 0.5)';
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  // Top-left
  ctx.beginPath(); ctx.moveTo(30, 30 + cornerSize); ctx.lineTo(30, 30); ctx.lineTo(30 + cornerSize, 30); ctx.stroke();
  // Top-right
  ctx.beginPath(); ctx.moveTo(W - 30 - cornerSize, 30); ctx.lineTo(W - 30, 30); ctx.lineTo(W - 30, 30 + cornerSize); ctx.stroke();
  // Bottom-left
  ctx.beginPath(); ctx.moveTo(30, H - 30 - cornerSize); ctx.lineTo(30, H - 30); ctx.lineTo(30 + cornerSize, H - 30); ctx.stroke();
  // Bottom-right
  ctx.beginPath(); ctx.moveTo(W - 30 - cornerSize, H - 30); ctx.lineTo(W - 30, H - 30); ctx.lineTo(W - 30, H - 30 - cornerSize); ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function WallPosterFrame({
  position,
  rotation = [0, -Math.PI / 2, 0],
  posterUrl,
  slotIndex,
  onClickEmpty,
  onClickFilled,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  posterUrl?: string | null;
  slotIndex: number;
  onClickEmpty?: (slotIndex: number) => void;
  onClickFilled?: (slotIndex: number) => void;
}) {
  const [imgTexture, setImgTexture] = useState<THREE.Texture | null>(null);
  const [hovered, setHovered] = useState(false);
  const woodTexture = useMemo(() => createWoodTexture(true), []);
  const emptyTexture = useMemo(() => createEmptyFrameTexture(), []);

  // Load poster image texture when URL is provided
  useEffect(() => {
    if (!posterUrl) {
      setImgTexture(null);
      return;
    }
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      posterUrl,
      (tex) => {
        if (cancelled) { tex.dispose(); return; }
        tex.colorSpace = THREE.SRGBColorSpace;
        setImgTexture(tex);
      },
      undefined,
      () => { /* load error */ }
    );
    return () => { cancelled = true; };
  }, [posterUrl]);

  const hasPoster = !!posterUrl && !!imgTexture;

  return (
    <group position={position} rotation={rotation}>
      {/* Wooden frame border — large poster size */}
      <mesh>
        <boxGeometry args={[1.8, 2.4, 0.1]} />
        <meshBasicMaterial map={woodTexture} />
      </mesh>
      {/* Inner background */}
      <mesh position={[0, 0, 0.052]}>
        <planeGeometry args={[1.5, 2.1]} />
        <meshBasicMaterial color={hasPoster ? '#f5f5f0' : '#1a1430'} />
      </mesh>
      {/* Poster image or empty placeholder — clickable */}
      <mesh
        position={[0, 0, 0.054]}
        onClick={(e) => {
          e.stopPropagation();
          if (hasPoster) onClickFilled?.(slotIndex);
          else onClickEmpty?.(slotIndex);
        }}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <planeGeometry args={[1.4, 1.95]} />
        <meshBasicMaterial map={hasPoster ? imgTexture : emptyTexture} transparent={!hasPoster} />
      </mesh>
    </group>
  );
}

// ============================================================================
// SHOP IMAGE POSTER — display-only frame showing the shop image on back wall
// ============================================================================
function ShopImagePoster({
  position,
  rotation = [0, 0, 0],
  imageUrl,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  imageUrl?: string;
}) {
  const [imgTexture, setImgTexture] = useState<THREE.Texture | null>(null);
  const woodTexture = useMemo(() => createWoodTexture(true), []);

  useEffect(() => {
    if (!imageUrl) { setImgTexture(null); return; }
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      imageUrl,
      (tex) => { if (cancelled) { tex.dispose(); return; } tex.colorSpace = THREE.SRGBColorSpace; setImgTexture(tex); },
      undefined,
      () => { /* load error */ }
    );
    return () => { cancelled = true; };
  }, [imageUrl]);

  if (!imageUrl) return null;

  return (
    <group position={position} rotation={rotation}>
      {/* Wooden frame */}
      <mesh>
        <boxGeometry args={[1.8, 2.4, 0.1]} />
        <meshBasicMaterial map={woodTexture} />
      </mesh>
      {/* Inner background */}
      <mesh position={[0, 0, 0.052]}>
        <planeGeometry args={[1.5, 2.1]} />
        <meshBasicMaterial color={imgTexture ? '#f5f5f0' : '#1a1430'} />
      </mesh>
      {/* Image */}
      {imgTexture && (
        <mesh position={[0, 0, 0.054]}>
          <planeGeometry args={[1.4, 1.95]} />
          <meshBasicMaterial map={imgTexture} />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// MAIN FURNITURE ARRANGEMENT
// ============================================================================
// Convert floor plan percentage coordinates to 3D world coordinates
// Formula: X_3d = ((x_pct - 3) / 94) * 17.4 - 8.7,  Z_3d = ((y_pct - 3) / 94) * 13.4 - 6.7
function pctTo3D(xPct: number, yPct: number, defaultY: number = 0): [number, number, number] {
  const x3d = ((xPct - 3) / 94) * 17.4 - 8.7;
  const z3d = ((yPct - 3) / 94) * 13.4 - 6.7;
  return [x3d, defaultY, z3d];
}

// Default positions in floor plan percentage coordinates
const FURNITURE_DEFAULTS: Record<string, { x: number; y: number }> = {
  table: { x: 44, y: 58 },
  atm: { x: 3, y: 93 },
  vending: { x: 91, y: 93 },
  bench: { x: 13, y: 89 },
  books1: { x: 15, y: 4 },
  books2: { x: 79, y: 4 },
};

export function ShopFurniture({ shopImageUrl, layoutPositions, onTVClick, tvPosterUrl, wallPosters, onWallPosterClickEmpty, onWallPosterClickFilled }: { shopImageUrl?: string; layoutPositions?: Record<string, { x: number; y: number; rotation?: number }> | null; onTVClick?: () => void; tvPosterUrl?: string; wallPosters?: (string | null)[]; onWallPosterClickEmpty?: (slotIndex: number) => void; onWallPosterClickFilled?: (slotIndex: number) => void; }) {
  // Resolve positions for movable furniture items
  const getPos = (id: string, defaultY: number = 0): [number, number, number] => {
    const saved = layoutPositions?.[id];
    const defaults = FURNITURE_DEFAULTS[id];
    if (saved) return pctTo3D(saved.x, saved.y, defaultY);
    if (defaults) return pctTo3D(defaults.x, defaults.y, defaultY);
    return [0, defaultY, 0];
  };

  const tablePos = getPos('table', 0);
  const atmPos = getPos('atm', 0);
  const vendingPos = getPos('vending', 0);
  const benchPos = getPos('bench', 0);
  const books1Pos = getPos('books1', 0.9);
  const books2Pos = getPos('books2', 0.9);

  return (
    <group name="shop-furniture">
      {/* ===== MAIN INTERIOR ITEMS ===== */}
      {/* ATM on left side of entrance, flush to front wall */}
      <ATM position={atmPos} rotation={[0, Math.PI, 0]} />
      {/* Vending machine on right side of entrance, facing outward */}
      <VendingMachine position={vendingPos} rotation={[0, 0, 0]} />
      <ButterRobot position={[3, 0.92, -5.5]} rotation={[0, 0, 0]} />
      <ToyRobot position={[-7, 0, -4]} rotation={[0, Math.PI / 4, 0]} />

      {/* ===== CASHIER NPC ===== */}
      <CashierNPC position={[-1.5, 0, -4]} rotation={[0, Math.PI / 6, 0]} />

      {/* ===== DECORATIVE ITEMS ===== */}
      {/* Plants — interior walls */}
      <Plant position={[-8, 0, -2]} scale={0.9} />
      <Plant position={[8, 0, -4]} scale={0.8} />
      {/* Tree beside ATM (left of entrance) */}
      <Plant position={[atmPos[0] + 1.4, 0, atmPos[2]]} scale={1.0} />
      {/* Tree beside Vending Machine (right of entrance) */}
      <Plant position={[vendingPos[0] - 1.4, 0, vendingPos[2]]} scale={1.0} />

      {/* Trash can */}
      <TrashCan position={[8, 0, 5]} />

      {/* Bookshelf against back wall */}
      <BookShelf position={books1Pos} />
      <BookShelf position={books2Pos} />

      {/* Wall clock on back wall */}
      <WallClock position={[0, 3.5, -6.9]} rotation={[Math.PI / 2, 0, 0]} />

      {/* Framed art on walls - left wall has CSR badges, TV now on ceiling */}
      <FramedArt position={[-8.85, 3, 4]} rotation={[0, Math.PI / 2, 0]} color="#e74c3c" />
      <FramedArt position={[0, 3.5, -6.85]} rotation={[0, 0, 0]} color="#f1c40f" />
      <FramedArt position={[-4, 3.5, -6.85]} rotation={[0, 0, 0]} color="#1abc9c" />

      {/* Wall Poster Frames – right wall (3 interactive slots) */}
      <WallPosterFrame position={[8.6, 2.8, -0.2]} slotIndex={0} posterUrl={wallPosters?.[0] ?? null} onClickEmpty={onWallPosterClickEmpty} onClickFilled={onWallPosterClickFilled} />
      <WallPosterFrame position={[8.6, 2.8, 2.2]} slotIndex={1} posterUrl={wallPosters?.[1] ?? null} onClickEmpty={onWallPosterClickEmpty} onClickFilled={onWallPosterClickFilled} />
      <WallPosterFrame position={[8.6, 2.8, 4.6]} slotIndex={2} posterUrl={wallPosters?.[2] ?? null} onClickEmpty={onWallPosterClickEmpty} onClickFilled={onWallPosterClickFilled} />

      {/* Shop Image Posters – back wall, flanking the cashier counter */}
      <ShopImagePoster position={[-5, 2.5, -6.82]} rotation={[0, 0, 0]} imageUrl={shopImageUrl} />
      <ShopImagePoster position={[5, 2.5, -6.82]} rotation={[0, 0, 0]} imageUrl={shopImageUrl} />

      {/* TV hanging from center ceiling — shows poster if set, else shop image */}
      <ShopTV
        position={[0, 3.5, -2]}
        rotation={[0, 0, 0]}
        imageUrl={tvPosterUrl || shopImageUrl}
        onClick={onTVClick}
      />

      {/* Tables and chairs removed */}
    </group>
  );
}

export default ShopFurniture;
