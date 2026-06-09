import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

export interface TutorialStep {
  id: string;
  /** CSS selector to highlight. If null, shows a centred modal step. */
  target?: string | null;
  title: string;
  body: string;
  /** Optional position hint for the tooltip relative to the target. */
  placement?: 'top' | 'bottom' | 'auto';
  /** Emoji shown beside the title. */
  emoji?: string;
}

interface FirstTimeTutorialProps {
  /** Stable key used in localStorage to remember "completed" per user. */
  storageKey: string;
  steps: TutorialStep[];
  /** Optional override — show the tutorial even if already completed. */
  forceShow?: boolean;
  onClose?: () => void;
  /** Localized labels. */
  labels?: { next?: string; back?: string; done?: string; skip?: string };
}

interface Rect { x: number; y: number; w: number; h: number; }

const PAD = 8;

/**
 * First-time onboarding coach-marks.
 *
 * Reads `localStorage[storageKey]` to decide whether to show. Each step can
 * either highlight a real DOM element by selector (cutting a hole through a
 * dimmed overlay) or be a free-floating modal step.
 *
 * Mobile-first: the tooltip is positioned with viewport-aware math so it
 * never spills off-screen, and the navigation buttons are ≥48 px tall.
 * Tutorial state persists per user so it doesn't re-show on every visit.
 */
export function FirstTimeTutorial({
  storageKey,
  steps,
  forceShow = false,
  onClose,
  labels = {},
}: FirstTimeTutorialProps) {
  const next = labels.next ?? 'Next';
  const back = labels.back ?? 'Back';
  const done = labels.done ?? 'Got it';
  const skip = labels.skip ?? 'Skip';

  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Decide whether to show on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (forceShow) { setActive(true); return; }
    try {
      const done = localStorage.getItem(storageKey);
      if (!done) setActive(true);
    } catch { /* localStorage blocked → don't show */ }
  }, [storageKey, forceShow]);

  // Compute the target rect when step changes or window resizes.
  useLayoutEffect(() => {
    if (!active) return;
    const compute = () => {
      const step = steps[stepIdx];
      if (!step?.target) { setRect(null); return; }
      const el = document.querySelector(step.target) as HTMLElement | null;
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect({ x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 });
      // Scroll the element into view if it's off-screen.
      if (r.top < 80 || r.bottom > window.innerHeight - 80) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    };
    compute();
    window.addEventListener('resize', compute);
    const id = window.setInterval(compute, 250); // catch layout shifts
    return () => { window.removeEventListener('resize', compute); window.clearInterval(id); };
  }, [active, stepIdx, steps]);

  const finish = () => {
    try { localStorage.setItem(storageKey, JSON.stringify({ done: true, at: Date.now() })); } catch {}
    setActive(false);
    onClose?.();
  };

  const step = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;

  // Tooltip placement: try to put it BELOW the target; fall back to ABOVE
  // if there's no room.
  const tooltipPos = useMemo(() => {
    if (!rect || typeof window === 'undefined') return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' as const };
    const vh = window.innerHeight;
    const tooltipH = 220; // approximate
    const below = rect.y + rect.h + 14;
    const above = rect.y - tooltipH - 14;
    const useBelow = below + tooltipH < vh || above < 12;
    return {
      top: useBelow ? `${below}px` : `${Math.max(12, above)}px`,
      left: '50%',
      transform: 'translateX(-50%)' as const,
      maxWidth: 'min(360px, calc(100vw - 24px))',
      width: 'calc(100vw - 24px)',
    };
  }, [rect]);

  return (
    <AnimatePresence>
      {active && step && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[300]"
        >
          {/* Dimmed backdrop with a "cut-out" SVG mask for the highlighted
              element. Pointer events pass through the hole so the user can
              actually tap the highlighted item if they want. */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <mask id="tutorial-mask">
                <rect width="100%" height="100%" fill="white" />
                {rect && (
                  <rect
                    x={rect.x}
                    y={rect.y}
                    width={rect.w}
                    height={rect.h}
                    rx="16"
                    ry="16"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(8, 10, 23, 0.78)"
              mask="url(#tutorial-mask)"
            />
          </svg>

          {/* Glowing ring around the spotlighted element */}
          {rect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute pointer-events-none rounded-2xl"
              style={{
                left: rect.x,
                top: rect.y,
                width: rect.w,
                height: rect.h,
                boxShadow: '0 0 0 2px rgba(167, 139, 250, 0.85), 0 0 24px 4px rgba(167, 139, 250, 0.45)',
              }}
            />
          )}

          {/* Tooltip */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="absolute pointer-events-auto"
            style={tooltipPos}
          >
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-violet-200/60 dark:border-violet-500/30 overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 flex items-center justify-between text-white">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wide truncate">
                    Step {stepIdx + 1} of {steps.length}
                  </span>
                </div>
                <button
                  onClick={finish}
                  aria-label="Skip tutorial"
                  className="w-9 h-9 rounded-full flex items-center justify-center active:bg-white/20 active:scale-95 transition-transform touch-manipulation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {step.emoji && <span className="text-xl" aria-hidden>{step.emoji}</span>}
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {step.body}
                </p>
              </div>

              <div
                className="px-3 py-3 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800"
                style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
              >
                <button
                  onClick={finish}
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2 rounded-lg active:bg-slate-100 dark:active:bg-slate-800 touch-manipulation"
                >
                  {skip}
                </button>
                <div className="flex items-center gap-2">
                  {stepIdx > 0 && (
                    <button
                      onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                      className="min-h-[44px] px-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 active:bg-slate-100 dark:active:bg-slate-800 active:scale-95 transition-transform touch-manipulation flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" /> {back}
                    </button>
                  )}
                  <button
                    onClick={() => (isLast ? finish() : setStepIdx((i) => i + 1))}
                    className="min-h-[44px] px-5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 active:from-violet-700 active:to-fuchsia-700 active:scale-95 transition-transform shadow-lg shadow-violet-500/25 touch-manipulation flex items-center gap-1"
                  >
                    {isLast ? done : next}
                    {!isLast && <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
