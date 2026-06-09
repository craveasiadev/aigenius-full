import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { KenneyModel } from './KenneyModel';

/**
 * Kenney car kit vehicles, sized + animated to fit our 2-unit tile grid.
 *
 * **Scale.** Kenney cars are about 2 units long in their native model
 * scale. Without correcting that, a car at the same scale as a building
 * (×2) ends up 4 units long — longer than a road tile. We use a tighter
 * scale (`VEHICLE_SCALE = 0.9`) so a sedan is ~1.8 units long, fitting
 * one road tile lengthwise with a small visual gap to the kerb.
 *
 * **Movement.** Cars driving the road follow a simple linear scan
 * between `start` and `end` waypoints. When a car passes its `end`, it
 * snaps back to `start` and continues — the "car drives off-screen, a
 * new one appears" loop that ambient city scenes use.
 *
 * **Raycast.** Both parked and moving cars set `interactive={false}`
 * inside KenneyModel so they don't block clicks on the shops behind
 * them.
 */

// Final pass on size — at 0.4 a Kenney car is ~0.8 units long, fitting
// one road-tile lane (each lane is ~1 unit wide on a 2-unit-tile road)
// with room for cars in both lanes on the same road tile. Anything bigger
// and one car straddles both lanes.
const VEHICLE_SCALE = 0.4;

interface MovingVehicleProps {
  /** GLB path (one of KENNEY_VEHICLES). */
  path: string;
  /** World position where the car starts each loop. */
  start: [number, number, number];
  /** World position where the car loops back from. */
  end: [number, number, number];
  /** World units per second. Defaults to a city-friendly crawl. */
  speed?: number;
  /** Optional phase offset (0..1) so multiple cars don't bunch up. */
  phase?: number;
}

export function MovingVehicle({
  path,
  start,
  end,
  speed = 2.2,
  phase = 0,
}: MovingVehicleProps) {
  const ref = useRef<THREE.Group>(null);

  // Vector from start to end, computed once. Used to advance position
  // and to compute the car's facing direction (yaw = atan2(dx, dz)).
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const segLen = Math.hypot(dx, dz) || 1;
  const yaw = Math.atan2(dx, dz);

  // Progress along the segment in 0..1. Mutated each frame.
  const t = useRef(phase % 1);

  useFrame((_, dt) => {
    if (!ref.current) return;
    t.current += (speed * dt) / segLen;
    if (t.current >= 1) t.current -= 1; // wrap — snap to start
    const x = start[0] + dx * t.current;
    const z = start[2] + dz * t.current;
    ref.current.position.set(x, 0.04, z);
  });

  return (
    <group ref={ref} position={start} rotation={[0, yaw, 0]}>
      <KenneyModel path={path} scale={VEHICLE_SCALE} interactive={false} />
    </group>
  );
}

interface ParkedVehicleProps {
  path: string;
  position: [number, number, number];
  /** Facing direction in radians. 0 = facing +Z (south on our grid). */
  rotationY?: number;
}

export function ParkedVehicle({
  path,
  position,
  rotationY = 0,
}: ParkedVehicleProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <KenneyModel path={path} scale={VEHICLE_SCALE} interactive={false} />
    </group>
  );
}
