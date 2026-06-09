/**
 * Lite-physics drop-in replacements for `@react-three/rapier` +
 * `ecctrl`. When enabled (via the `USE_LITE_PHYSICS` const in ShopGame3D),
 * the scene renders without ANY physics engine — saving ~2 MB of Rapier
 * WASM plus the entire WASM-compile freeze on slow CPUs.
 *
 *   • `<MaybeRigidBody>` — context-aware. Renders <RigidBody> when full
 *     physics is on, plain <group> when in lite mode. Drop-in replacement
 *     for existing <RigidBody> call sites.
 *
 *   • `<LitePhysicsProvider enabled={…}>` — wraps the scene tree and
 *     publishes the lite flag to MaybeRigidBody children.
 *
 *   • `<LitePlayer>` — kinematic player controller. Uses no physics lib.
 *     Walking, sprint, jump (gravity), camera-relative movement.
 *
 *   • `<LiteJoystick>` — custom touch joystick + jump button. Mobile only.
 *
 *   • `useLiteInputRef` — keyboard input listener, returns a shared ref
 *     the joystick + controller both read/write.
 */
export { LitePhysicsProvider, MaybeRigidBody, useLitePhysics } from './LitePhysicsContext';
export { LitePlayer } from './LitePlayer';
export { LiteJoystick } from './LiteJoystick';
export { useLiteInputRef } from './useLiteInput';
export type { LiteInputState } from './useLiteInput';
