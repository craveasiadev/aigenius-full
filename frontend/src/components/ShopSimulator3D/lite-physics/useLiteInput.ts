import { useEffect, useRef } from 'react';

export interface LiteInputState {
  /** Movement vector in screen-space (joystick or WASD): x = strafe, z = forward/back. */
  move: { x: number; z: number };
  /** Sprint key / button pressed. */
  running: boolean;
  /** One-shot: set to true on jump press, consumed by the controller. */
  jumpPressed: boolean;
}

/**
 * Centralised input ref. Updated from keyboard listeners + the joystick.
 * Read each frame by `LitePlayerController`. Stored in a ref (not state)
 * so input updates don't cause React re-renders.
 */
export function useLiteInputRef() {
  const ref = useRef<LiteInputState>({ move: { x: 0, z: 0 }, running: false, jumpPressed: false });

  useEffect(() => {
    const keys = new Set<string>();
    // Track whether the last update came from keyboard. When the joystick is
    // dragging, it writes to `ref.current.move` directly via pointer events,
    // which sets `keyboardOwns = false`. We only zero the move vector on
    // key-up if the keyboard was the most recent writer.
    let keyboardOwns = false;
    const recompute = () => {
      let x = 0;
      let z = 0;
      if (keys.has('w') || keys.has('arrowup')) z -= 1;
      if (keys.has('s') || keys.has('arrowdown')) z += 1;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (x !== 0 || z !== 0) {
        ref.current.move = { x, z };
        keyboardOwns = true;
      } else if (keyboardOwns) {
        ref.current.move = { x: 0, z: 0 };
        keyboardOwns = false;
      }
      ref.current.running = keys.has('shift');
    };
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'spacebar') {
        ref.current.jumpPressed = true;
        e.preventDefault();
        return;
      }
      keys.add(k);
      recompute();
    };
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.delete(k);
      recompute();
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  return ref;
}
