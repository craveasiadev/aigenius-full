/**
 * BottomNav — global mobile dock used on every satellite + module page.
 *
 * Visual language matches the iso world's WorldDock (rounded slate pill
 * with chunky 56-px tiles + violet→fuchsia active state). Five visible
 * slots: Home / Store / Explore / Rewards / More.
 *
 * Nav data + the "More" sheet live in `studentNav.tsx` so this dock and
 * the iso WorldDock stay perfectly in sync — add a route in one place and
 * both navs pick it up.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { MAIN_NAV, StudentMoreSheet } from './studentNav';

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  // "More" reads as active when we're on any non-main page so users can find their way back.
  const onMorePage =
    !MAIN_NAV.some((item) => isActive(item.path)) &&
    location.pathname.startsWith('/s/');

  return (
    <>
      {/* ── "More" sheet (shared with the iso WorldDock) ─────────────── */}
      <StudentMoreSheet show={showMore} onClose={() => setShowMore(false)} />

      {/* ── Bottom dock ──────────────────────────────────────────────── */}
      <div
        className="fixed inset-x-0 z-[80] flex justify-center pointer-events-none"
        style={{ bottom: 'max(env(safe-area-inset-bottom), 14px)' }}
      >
        <motion.nav
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 22, stiffness: 220, delay: 0.05 }}
          aria-label="Primary"
          className="pointer-events-auto"
          style={{
            // Fluid cap: leave breathing room on phones, never blow up
            // wider than 720 px on tablets/desktop, never crash through
            // safe-area on landscape iPad with rotated home-bar.
            maxWidth: 'min(calc(100vw - calc(env(safe-area-inset-left) + env(safe-area-inset-right) + 24px)), 720px)',
            width: 'max-content',
          }}
          onTouchStart={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div
            className="flex rounded-3xl bg-slate-900/85 backdrop-blur-md shadow-xl shadow-black/40 border border-white/10 touch-manipulation"
            style={{
              // Fluid gap + padding: tight on tiny screens (round/watch
              // and 360 px phones) so all 5 tiles fit; comfortable on
              // tablet/desktop without looking sparse.
              gap: 'clamp(2px, 1vw, 8px)',
              padding: 'clamp(6px, 1.2vw, 10px)',
            }}
          >
            {MAIN_NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.path)}
                  aria-label={item.label}
                  aria-pressed={active}
                  style={{
                    // Fluid tile: ≥ 44 px touch target on watch/phone,
                    // grows to ~64 px on tablets+. clamp() means a 4K
                    // monitor doesn't get postage-stamp dock tiles.
                    minWidth: 'clamp(44px, 12vw, 64px)',
                    minHeight: 'clamp(44px, 12vw, 64px)',
                  }}
                  className={[
                    'relative flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors active:scale-90 touch-manipulation touch-target',
                    active
                      ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/40'
                      : 'text-white/75 active:bg-white/10',
                  ].join(' ')}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold leading-none">{item.label}</span>
                </button>
              );
            })}

            {/* More */}
            <button
              type="button"
              onClick={() => setShowMore(true)}
              aria-label="More"
              aria-pressed={onMorePage}
              style={{
                minWidth: 'clamp(44px, 12vw, 64px)',
                minHeight: 'clamp(44px, 12vw, 64px)',
              }}
              className={[
                'relative flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors active:scale-90 touch-manipulation touch-target',
                onMorePage
                  ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/40'
                  : 'text-white/75 active:bg-white/10',
              ].join(' ')}
            >
              <Menu className="w-5 h-5" />
              <span className="text-[10px] font-semibold leading-none">More</span>
            </button>
          </div>
        </motion.nav>
      </div>
    </>
  );
};

export default BottomNav;
