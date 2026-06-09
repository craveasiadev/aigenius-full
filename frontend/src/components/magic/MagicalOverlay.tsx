/**
 * MagicalOverlay — the "always-on tiny wonders" layer that sits on top of
 * the iso world. Three independent systems share one mount point because
 * they all want to live at the same z-stack and need to be cheap together:
 *
 *   1. SHOOTING STARS — a soft star sprite arcs across the sky every
 *      ~25-60 seconds. Tappable for a small XP/coin burst (via Spark's
 *      celebration channel — no backend write).
 *   2. FESTIVAL DOODADS — a slow background sprinkle of the current
 *      festival's emoji (lanterns / sunflowers / rainbows / stars) drift
 *      diagonally across the screen so the season visibly tints the world.
 *   3. HIDDEN SECRETS — 3 invisible tap hotspots positioned at fixed
 *      viewport corners. Finding one shows a brief sparkle + adds a secret
 *      collectible. Each spot can only be claimed once per device.
 *
 * Pure DOM — no extra WebGL contexts, no react-three-fiber. We keep the
 * 3D scene clean and reserve this overlay layer for cheap pixel-density
 * sprinkles that read instantly.
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useSpark } from '../companion/CompanionProvider';
import { getCurrentFestival } from '../../data/festivals';
import { grantSecret, ownsSecret, grantPet } from '../../lib/collection';
import { petForSecret } from '../../data/pets';
import { sfxCoin, sfxSecret } from '../../lib/sfx';

const STAR_MIN_GAP_MS = 25_000;
const STAR_MAX_GAP_MS = 60_000;

interface ShootingStar { id: number; topPct: number; }

export function MagicalOverlay() {
  const spark = useSpark();
  const festival = getCurrentFestival();

  const [star, setStar] = useState<ShootingStar | null>(null);
  const [foundFlash, setFoundFlash] = useState<{ id: number; x: number; y: number } | null>(null);
  const starIdRef = useRef(0);
  const flashIdRef = useRef(0);

  // Schedule shooting stars at random intervals. One-at-a-time so we
  // never have a sky full of streaks.
  useEffect(() => {
    let cancelled = false;
    const schedule = () => {
      const wait = STAR_MIN_GAP_MS + Math.random() * (STAR_MAX_GAP_MS - STAR_MIN_GAP_MS);
      window.setTimeout(() => {
        if (cancelled) return;
        starIdRef.current += 1;
        setStar({ id: starIdRef.current, topPct: 10 + Math.random() * 30 });
        // Star animates for ~2.5s; clear so the next one can fire.
        window.setTimeout(() => { if (!cancelled) setStar(null); }, 2600);
        schedule();
      }, wait);
    };
    schedule();
    return () => { cancelled = true; };
  }, []);

  function handleStarTap() {
    if (!star) return;
    setStar(null);
    sfxCoin();
    spark.cheer('Lucky! ⭐ You caught a wish!');
  }

  function handleSecretTap(id: string, e: React.MouseEvent | React.TouchEvent) {
    if (ownsSecret(id)) return;
    if (!grantSecret(id)) return;
    sfxSecret();
    // Some secrets carry a legendary pet — grant it immediately and
    // let Spark celebrate the new companion alongside the secret.
    const pet = petForSecret(id);
    if (pet && grantPet(pet.id)) {
      spark.cheer(`Whoa!! A legendary ${pet.name}! ${pet.emoji}`);
    } else {
      spark.cheer('Ooooh! You found a secret! ✨');
    }
    flashIdRef.current += 1;
    const point = 'touches' in e
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
    setFoundFlash({ id: flashIdRef.current, ...point });
    window.setTimeout(() => setFoundFlash((f) => (f && f.id === flashIdRef.current ? null : f)), 1500);
  }

  return (
    <div className="fixed inset-0 z-20 pointer-events-none">
      {/* ── Festival doodad drift — ambient, never blocks taps ── */}
      <FestivalDrift doodad={festival.doodad} accentHex={festival.accentHex} />

      {/* ── Shooting star (one at a time) ── */}
      <AnimatePresence>
        {star && (
          <motion.button
            key={star.id}
            type="button"
            onClick={handleStarTap}
            aria-label="Tap the shooting star!"
            initial={{ x: '-12vw', y: 0, opacity: 0, rotate: -25 }}
            animate={{ x: '112vw', y: 80, opacity: 1, rotate: -25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.4, ease: 'linear' }}
            className="absolute pointer-events-auto text-3xl drop-shadow"
            style={{ top: `${star.topPct}%`, filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.8))' }}
          >
            ⭐
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Hidden tap-spots (3 fixed viewport corners) ──────────────
            Invisible 48x48 hit areas; finding one fires a sparkle + chime
            and adds the secret to the collection. Each one is one-shot. */}
      <HiddenSpot id="secret_corner_tl" style={{ top: 4,    left: 4   }} onFound={handleSecretTap} />
      <HiddenSpot id="secret_corner_tr" style={{ top: 4,    right: 4  }} onFound={handleSecretTap} />
      <HiddenSpot id="secret_corner_br" style={{ bottom: 80, right: 4 }} onFound={handleSecretTap} />

      {/* Sparkle flash where a secret was just found */}
      <AnimatePresence>
        {foundFlash && (
          <motion.div
            key={foundFlash.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1.4 }}
            exit={{ opacity: 0, scale: 1.8 }}
            transition={{ duration: 1.2 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-amber-300"
            style={{ left: foundFlash.x, top: foundFlash.y }}
          >
            <Sparkles className="w-10 h-10 drop-shadow" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Slow diagonal drift of a few festival emojis behind everything else.
 *  Reset each animation cycle so the loop is seamless. */
function FestivalDrift({ doodad, accentHex }: { doodad: string; accentHex: string }) {
  // 4 staggered drifters — enough density to feel seasonal, not enough to
  // distract from the actual game.
  const drifters = [0, 1, 2, 3];
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {drifters.map((i) => (
        <motion.span
          key={i}
          initial={{ x: '-10vw', y: `${10 + i * 25}vh`, opacity: 0 }}
          animate={{ x: '110vw', y: `${5 + i * 25}vh`, opacity: 0.7 }}
          transition={{
            duration: 38 + i * 9,
            repeat: Infinity,
            delay: i * 7,
            ease: 'linear',
          }}
          className="absolute text-2xl select-none"
          style={{ filter: `drop-shadow(0 0 6px ${accentHex}66)` }}
        >
          {doodad}
        </motion.span>
      ))}
    </div>
  );
}

function HiddenSpot({
  id, style, onFound,
}: {
  id: string;
  style: React.CSSProperties;
  onFound: (id: string, e: React.MouseEvent | React.TouchEvent) => void;
}) {
  // Already found → no hit area at all (nothing to discover twice).
  if (ownsSecret(id)) return null;
  return (
    <button
      type="button"
      aria-label="Secret"
      onClick={(e) => onFound(id, e)}
      className="absolute w-12 h-12 pointer-events-auto rounded-full"
      // Slight transparency so a curious kid who taps a corner sees a hint;
      // a true hardcore "easter egg" would be invisible, but we want
      // discovery, not frustration.
      style={{ ...style, background: 'rgba(255,255,255,0.04)' }}
    />
  );
}

export default MagicalOverlay;
