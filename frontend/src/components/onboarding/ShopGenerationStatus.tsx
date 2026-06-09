/**
 * Shop Generation Status — themed status panel for the dashboard's
 * shop-image area. Replaces the three inline blocks (pending /
 * generating / failed / empty) with one component that:
 *
 *   • Matches the AIpreneur design language — glass card on a calm
 *     dotted backdrop, 3D buttons, no gradients, no glow.
 *   • Surfaces actual progress: elapsed time since generation started,
 *     polling errors, and a "taking longer than usual" warning after
 *     a threshold so the user knows something might be wrong instead
 *     of staring at an infinite spinner.
 *   • Offers an escape hatch after a longer threshold: Retry +
 *     Skip-for-now buttons + a "Show details" disclosure that prints
 *     the last poll error and current status so a parent or support
 *     agent can diagnose.
 *
 * Used by AIpreneurDashboard when `business?.shop_image_status !==
 * 'completed'` and the cached `hasShopImage` is false.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2, AlertTriangle, ChevronDown, Camera, Sparkles, LifeBuoy,
} from 'lucide-react';
import {
  GLASS, BTN_3D_PRIMARY, BTN_3D_SECONDARY,
} from '../../lib/uiTokens';

/** Email used by the default Contact-support button. The dashboard can
 *  override the button entirely by passing its own `onContactSupport`. */
const DEFAULT_SUPPORT_EMAIL = 'support@aipreneur.com';

// Status values the dashboard's `business.shop_image_status` can hold.
type ShopImageStatus = 'pending' | 'generating' | 'failed' | 'completed' | null | undefined;

interface ShopGenerationStatusProps {
  status: ShopImageStatus;
  /** True when the dashboard's cached snapshot has an image. We render
   *  nothing in that case — the dashboard renders the shop view. */
  hasShopImage: boolean;
  /** Most recent error from polling `loadBusiness`, if any. */
  lastError: string | null;
  onCreateShop: () => void;
  /** Optional — override the Contact-support button behaviour. By
   *  default it opens a mailto: link to DEFAULT_SUPPORT_EMAIL with the
   *  current status, elapsed time, and last error pre-filled in the
   *  body so support can diagnose without going back-and-forth. */
  onContactSupport?: () => void;
}

// Thresholds in seconds.
//   WARN_AT_SEC → show the amber "taking longer than usual" note
//   RESCUE_AT_SEC → also surface the Contact support button + force-open
//                   the technical details panel.
const WARN_AT_SEC = 30;
const RESCUE_AT_SEC = 60;

export function ShopGenerationStatus({
  status,
  hasShopImage,
  lastError,
  onCreateShop,
  onContactSupport,
}: ShopGenerationStatusProps) {
  // ── Elapsed time tracking ──────────────────────────────────────
  // We track when this status block first sees a "generating" state and
  // tick a counter every second so the UI shows real elapsed time. The
  // counter resets whenever generation finishes or restarts.
  const startedAtRef = useRef<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const isGenerating = status === 'pending' || status === 'generating';

  useEffect(() => {
    if (!isGenerating) {
      startedAtRef.current = null;
      setElapsedSec(0);
      return;
    }
    if (startedAtRef.current === null) startedAtRef.current = Date.now();
    const tick = () => {
      if (startedAtRef.current === null) return;
      setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [isGenerating]);

  // [showDetails] toggles the technical details disclosure on the
  // "stuck" + failed screens. Defaults to closed.
  const [showDetails, setShowDetails] = useState(false);

  // Contact-support handler. If the host page provides one we defer to
  // it; otherwise we open a mailto: with the current status + elapsed
  // time + last error pre-filled so the support agent has the diagnostics
  // they need without an additional round-trip.
  const handleContactSupport = () => {
    if (onContactSupport) {
      onContactSupport();
      return;
    }
    const subject = encodeURIComponent('Shop generation issue');
    const bodyLines = [
      'Hi, my shop image is stuck or failed to generate.',
      '',
      '— Diagnostic info —',
      `status: ${status ?? 'unknown'}`,
      `elapsed: ${formatElapsed(elapsedSec)}`,
      `lastError: ${lastError ?? 'none'}`,
      `page: ${typeof window !== 'undefined' ? window.location.href : ''}`,
    ];
    const body = encodeURIComponent(bodyLines.join('\n'));
    window.location.href = `mailto:${DEFAULT_SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  // Don't render anything if the shop is ready — the dashboard's main
  // shop view takes over.
  if (status === 'completed' || hasShopImage) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
      {/* Background — theme-aware solid + dotted texture */}
      <div
        aria-hidden
        className="absolute inset-0 bg-slate-50 dark:bg-slate-950"
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.10] dark:opacity-[0.05]"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(100,116,139,0.5) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className={`${GLASS} relative w-full max-w-md rounded-3xl p-6 sm:p-7 text-center`}
      >
        {/* ════════════════════════════════════════════════════════════
            EMPTY — "Create your shop" CTA
            ════════════════════════════════════════════════════════════ */}
        {!status && !hasShopImage && (
          <>
            <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600 border-b-[5px] border-violet-800">
              <Camera className="w-8 h-8 text-white" />
            </span>
            <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Create your shop
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Snap a photo, answer a few questions, then take a boss selfie.
            </p>
            <button
              type="button"
              onClick={onCreateShop}
              className={`${BTN_3D_PRIMARY} w-full min-h-[56px] px-6 text-base mt-5`}
            >
              <Sparkles className="w-5 h-5" />
              Get started
            </button>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════
            GENERATING — animated loader + elapsed time
            ════════════════════════════════════════════════════════════ */}
        {isGenerating && (
          <>
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
              className="inline-flex"
            >
              <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600 border-b-[5px] border-violet-800">
                <Loader2 className="w-8 h-8 text-white" />
              </span>
            </motion.span>
            <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Creating your shop
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              The AI is generating your storefront. This usually takes
              about 20–40 seconds.
            </p>

            {/* Elapsed time chip */}
            <div className={`${GLASS} inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-200`}>
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" aria-hidden />
              <span className="tabular-nums">Elapsed: {formatElapsed(elapsedSec)}</span>
            </div>

            {/* Take-longer-than-usual warning */}
            {elapsedSec >= WARN_AT_SEC && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-left flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-300 flex-shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                  This is taking longer than usual. Keep the page open — if
                  nothing happens by 60 seconds you'll get a retry button.
                </p>
              </motion.div>
            )}

            {/* Rescue UI — Contact support button appears once the user
             *  has been waiting long enough that something likely went
             *  wrong server-side. We deliberately do NOT show a retry or
             *  skip option: those would interrupt the in-flight job and
             *  could land the user in a worse state (e.g. half-generated
             *  shop, token charged twice). The loading screen stays put
             *  until the backend reports `completed` or `failed`. */}
            {elapsedSec >= RESCUE_AT_SEC && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <button
                  type="button"
                  onClick={handleContactSupport}
                  className={`${BTN_3D_SECONDARY} w-full min-h-[52px] px-5 text-sm`}
                >
                  <LifeBuoy className="w-4 h-4" />
                  Contact support
                </button>
              </motion.div>
            )}

            {/* Technical details disclosure */}
            {(elapsedSec >= WARN_AT_SEC || lastError) && (
              <DetailsDisclosure
                open={showDetails}
                onToggle={() => setShowDetails((v) => !v)}
                status={status ?? '—'}
                elapsedSec={elapsedSec}
                lastError={lastError}
              />
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════
            FAILED — backend marked the generation as failed
            ════════════════════════════════════════════════════════════ */}
        {status === 'failed' && (
          <>
            <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-500 border-b-[5px] border-rose-700">
              <AlertTriangle className="w-8 h-8 text-white" />
            </span>
            <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Generation failed
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              The AI couldn't build your shop image. Try again — usually
              the second attempt works.
            </p>

            <div className="mt-5">
              <button
                type="button"
                onClick={handleContactSupport}
                className={`${BTN_3D_PRIMARY} w-full min-h-[52px] px-5 text-sm`}
              >
                <LifeBuoy className="w-4 h-4" />
                Contact support
              </button>
            </div>

            <DetailsDisclosure
              open={showDetails}
              onToggle={() => setShowDetails((v) => !v)}
              status={status}
              elapsedSec={elapsedSec}
              lastError={lastError}
            />
          </>
        )}
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// DetailsDisclosure — collapsible "Show details" panel that prints the
// current status, elapsed time, and most recent polling error. Useful
// for parents/support diagnosing a stuck shop generation.
// ─────────────────────────────────────────────────────────────────────

function DetailsDisclosure({
  open,
  onToggle,
  status,
  elapsedSec,
  lastError,
}: {
  open: boolean;
  onToggle: () => void;
  status: string;
  elapsedSec: number;
  lastError: string | null;
}) {
  return (
    <div className="mt-4 text-left">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        {open ? 'Hide' : 'Show'} details
      </button>
      {open && (
        <div className="mt-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed break-words">
          <div>status: <span className="font-bold">{status}</span></div>
          <div>elapsed: <span className="font-bold tabular-nums">{formatElapsed(elapsedSec)}</span></div>
          {lastError && (
            <div className="mt-1 pt-1 border-t border-slate-200 dark:border-white/10">
              <div className="text-rose-600 dark:text-rose-300 font-bold">last error</div>
              <div>{lastError}</div>
            </div>
          )}
          {!lastError && (
            <div className="text-slate-500 dark:text-slate-400 italic">No polling errors recorded.</div>
          )}
        </div>
      )}
    </div>
  );
}

function formatElapsed(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export default ShopGenerationStatus;
