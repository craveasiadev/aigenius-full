import { createContext, forwardRef, useContext, ReactNode } from 'react';
import { RigidBody, type RapierRigidBody, type RigidBodyProps } from '@react-three/rapier';

/**
 * Toggles "lite physics" mode across the scene tree.
 *
 *   • `true`  → Rapier `<Physics>` is NOT mounted, and every `<MaybeRigidBody>`
 *               below renders as a plain `<group>` (visual only). The player
 *               uses a custom kinematic controller. Saves ~2 MB of WASM and
 *               eliminates the main-thread freeze entirely.
 *
 *   • `false` → Original behaviour. Rapier mounts, RigidBodies are active,
 *               Ecctrl drives the player.
 *
 * The toggle lives in `ShopGame3D` at module scope so it can be flipped from
 * a single constant during testing.
 */
const LitePhysicsContext = createContext<boolean>(false);

export function LitePhysicsProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return <LitePhysicsContext.Provider value={enabled}>{children}</LitePhysicsContext.Provider>;
}

export function useLitePhysics(): boolean {
  return useContext(LitePhysicsContext);
}

/**
 * Drop-in replacement for `<RigidBody>`. When lite-physics is on, the
 * `<RigidBody>` wrapper is bypassed and children render inside a plain
 * `<group>`. Position/rotation/scale props are forwarded to the group so
 * the visual layout stays identical.
 *
 * This means a single find/replace turns the existing scene into a
 * Rapier-free scene without touching every mesh.
 */
export const MaybeRigidBody = forwardRef<RapierRigidBody, RigidBodyProps>(
  function MaybeRigidBody({ children, position, rotation, scale, ...rapierProps }, ref) {
    const lite = useLitePhysics();
    if (lite) {
      // Spread only transform props that <group> understands; the rest
      // (type, colliders, lockTranslations, etc.) are physics-only and
      // are silently dropped in lite mode.
      return (
        <group position={position as any} rotation={rotation as any} scale={scale as any}>
          {children}
        </group>
      );
    }
    return (
      <RigidBody ref={ref} position={position} rotation={rotation} scale={scale} {...rapierProps}>
        {children}
      </RigidBody>
    );
  },
);
