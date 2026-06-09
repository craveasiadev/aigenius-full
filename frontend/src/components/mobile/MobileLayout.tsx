import { ReactNode } from 'react';
import { useScreenShape } from '../../hooks/useScreenShape';

interface MobileLayoutProps {
  children: ReactNode;
  /** Optional sticky/fixed header that the layout reserves space for. */
  header?: ReactNode;
  /** Optional sticky/fixed footer (e.g. <BottomNav />). The page below it
   *  gets bottom padding so content isn't hidden behind it. */
  footer?: ReactNode;
  /** Match the page background to the device chrome on mobile. */
  background?: string;
  /** Constrain readable content width on tablets/desktop while staying
   *  full-bleed on phones. Pass `false` to disable. */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | false;
  /** Custom CSS className for the content wrapper. */
  className?: string;
  /** Pass `true` if the page itself contains a Canvas/3D simulator and
   *  should NOT reserve safe-area padding (the 3D scene draws under the
   *  notch by design). */
  edgeToEdge?: boolean;
  /** When the page wants its own scroll instead of letting body scroll. */
  scrollable?: boolean;
}

/** Footer reserved-space gauge. Phone footers are roughly 5.5rem tall;
 *  round (watch) footers shrink so the inscribed square isn't eaten;
 *  desktop wants a hair more breathing room. */
const FOOTER_RESERVES = {
  round:  '3.25rem',
  watch:  '3.25rem',
  phone:  '5.5rem',
  tablet: '5.25rem',
  desktop:'5rem',
} as const;

const MAX_WIDTH_CLASS: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

/**
 * Mobile-first page chrome.
 *
 * Provides:
 *   • Safe-area insets via `env(safe-area-inset-top/bottom)` — honored on
 *     iOS notched devices and Android edge-to-edge (Capacitor APK).
 *   • Reserved space for an optional sticky header AND footer so the
 *     content area never hides behind them.
 *   • Optional max-width centring for desktop/tablet reading comfort while
 *     staying full-bleed on phones.
 *   • A `touch-manipulation` class on the root so iOS doesn't add the
 *     300 ms tap delay.
 *
 * Used by all auth + module pages so PWA chrome behaviour is consistent.
 */
export function MobileLayout({
  children,
  header,
  footer,
  background = 'bg-slate-50 dark:bg-slate-950',
  maxWidth = false,
  className = '',
  edgeToEdge = false,
  scrollable = true,
}: MobileLayoutProps) {
  const { isWatch, breakpoint, isRound } = useScreenShape();
  const widthCls = maxWidth ? `${MAX_WIDTH_CLASS[maxWidth]} mx-auto` : '';
  const scrollCls = scrollable ? 'overflow-y-auto' : 'overflow-hidden';

  // Pick footer-reserve gauge based on the actual device shape so the
  // content area never hides behind a fixed footer on ANY screen — from
  // a 240×240 watch face to a 4K desktop monitor.
  const footerKey: keyof typeof FOOTER_RESERVES = isWatch
    ? 'watch'
    : isRound
      ? 'round'
      : breakpoint === 'xs' || breakpoint === 'sm'
        ? 'phone'
        : breakpoint === 'md'
          ? 'tablet'
          : 'desktop';
  const footerReserve = FOOTER_RESERVES[footerKey];

  return (
    <div
      className={`relative w-full min-h-dvh ${background} touch-manipulation`}
      style={
        edgeToEdge
          ? undefined
          : {
              paddingTop: 'env(safe-area-inset-top)',
              paddingLeft: 'env(safe-area-inset-left)',
              paddingRight: 'env(safe-area-inset-right)',
            }
      }
    >
      {header && (
        <div className="sticky top-0 z-30">
          {header}
        </div>
      )}
      <div
        className={`${scrollCls} ${widthCls} ${className} ${isRound ? 'round-safe' : ''}`}
        style={{
          paddingBottom: footer
            ? `calc(env(safe-area-inset-bottom) + ${footerReserve})`
            : 'env(safe-area-inset-bottom)',
        }}
      >
        {children}
      </div>
      {footer && (
        <div
          className="fixed bottom-0 left-0 right-0 z-30"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
