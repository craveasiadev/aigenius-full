import { useCallback, useEffect, useRef, useState } from 'react';
import type { LiteInputState } from './useLiteInput';

interface LiteJoystickProps {
  input: React.MutableRefObject<LiteInputState>;
  /** Show only on touch devices. */
  touchOnly?: boolean;
}

const KNOB_RADIUS_FRACTION = 0.5; // knob max travel = 50% of base radius

/**
 * Custom touch joystick (left) + jump button (right). Writes directly into
 * the shared input ref so the controller picks the values up next frame,
 * with zero React re-renders.
 *
 * Only mounted on touch-capable devices by default — desktop users get
 * keyboard input via `useLiteInputRef()`.
 */
export function LiteJoystick({ input, touchOnly = true }: LiteJoystickProps) {
  const [visible, setVisible] = useState(!touchOnly);
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0, r: 60 });

  useEffect(() => {
    if (!touchOnly || typeof window === 'undefined') return;
    const hasTouch = 'ontouchstart' in window || (navigator as any).maxTouchPoints > 0;
    if (hasTouch) setVisible(true);
  }, [touchOnly]);

  const updateCenter = useCallback(() => {
    if (!baseRef.current) return;
    const r = baseRef.current.getBoundingClientRect();
    center.current = { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 };
  }, []);

  const setKnob = useCallback((dx: number, dy: number) => {
    if (knobRef.current) knobRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (pointerId.current !== null) return;
    pointerId.current = e.pointerId;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    updateCenter();
    e.preventDefault();
    e.stopPropagation();
  }, [updateCenter]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (pointerId.current !== e.pointerId) return;
    const c = center.current;
    const maxR = c.r * KNOB_RADIUS_FRACTION;
    let dx = e.clientX - c.x;
    let dy = e.clientY - c.y;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) { dx = (dx / dist) * maxR; dy = (dy / dist) * maxR; }
    setKnob(dx, dy);
    // Normalise to [-1, 1] for the controller.
    input.current.move = { x: dx / maxR, z: dy / maxR };
    e.stopPropagation();
  }, [input, setKnob]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (pointerId.current !== e.pointerId) return;
    pointerId.current = null;
    setKnob(0, 0);
    input.current.move = { x: 0, z: 0 };
  }, [input, setKnob]);

  const onJump = useCallback((e: React.PointerEvent) => {
    input.current.jumpPressed = true;
    e.preventDefault();
    e.stopPropagation();
  }, [input]);

  if (!visible) return null;

  return (
    <>
      {/* Joystick base — bottom-left, above safe-area inset. */}
      <div
        ref={baseRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="fixed z-40 w-32 h-32 rounded-full select-none touch-none"
        style={{
          left: 'max(env(safe-area-inset-left), 16px)',
          bottom: 'max(env(safe-area-inset-bottom), 16px)',
          background: 'radial-gradient(circle at center, rgba(15,23,42,0.5) 0%, rgba(15,23,42,0.25) 70%, rgba(15,23,42,0.05) 100%)',
          border: '2px solid rgba(255,255,255,0.4)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        }}
        role="application"
        aria-label="Move joystick"
      >
        <div
          ref={knobRef}
          className="absolute top-1/2 left-1/2 w-14 h-14 rounded-full pointer-events-none"
          style={{
            marginTop: -28,
            marginLeft: -28,
            background: 'radial-gradient(circle at 30% 30%, #fff 0%, #e2e8f0 60%, #94a3b8 100%)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(0,0,0,0.15)',
            transition: pointerId.current === null ? 'transform 180ms ease-out' : 'none',
            willChange: 'transform',
          }}
        />
      </div>

      {/* Jump button — bottom-right. */}
      <button
        type="button"
        onPointerDown={onJump}
        className="fixed z-40 w-16 h-16 rounded-full select-none touch-none active:scale-90 transition-transform"
        style={{
          right: 'max(env(safe-area-inset-right), 16px)',
          bottom: 'max(env(safe-area-inset-bottom), 32px)',
          background: 'radial-gradient(circle at 30% 30%, #fbbf24 0%, #f59e0b 60%, #b45309 100%)',
          color: '#fff',
          border: '2px solid rgba(255,255,255,0.4)',
          boxShadow: '0 8px 24px rgba(245,158,11,0.4), inset 0 -3px 6px rgba(0,0,0,0.15)',
          fontSize: 22,
          fontWeight: 800,
        }}
        aria-label="Jump"
      >
        ↑
      </button>
    </>
  );
}
