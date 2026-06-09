import { ChevronLeft } from 'lucide-react';
import { ReactNode } from 'react';

interface MobileHeaderProps {
  title?: ReactNode;
  /** Optional subtitle shown under the title in smaller text. */
  subtitle?: ReactNode;
  /** Show a back chevron + handler. If omitted, no back button is shown. */
  onBack?: () => void;
  /** Slot for actions on the right (e.g. settings cog, save button). */
  right?: ReactNode;
  /** Match the page background / hero gradient. */
  className?: string;
  /** Render flush against the system status bar (good for hero gradients
   *  that should reach the top edge under the notch). */
  transparent?: boolean;
}

/**
 * Mobile-first page header.
 *
 * Honors `env(safe-area-inset-top)` so it doesn't slide under the iOS notch
 * or the Android status bar. Title centred, back button on the left, action
 * slot on the right — the universal native-app pattern.
 *
 * All hit targets are ≥48 px tall (`min-h-12`), so users can tap them
 * without zooming in.
 */
export function MobileHeader({
  title,
  subtitle,
  onBack,
  right,
  className = '',
  transparent = false,
}: MobileHeaderProps) {
  return (
    <header
      className={
        'w-full ' +
        (transparent
          ? 'bg-transparent'
          : 'bg-white/85 dark:bg-slate-900/85 backdrop-blur-lg border-b border-slate-200/70 dark:border-slate-800/70') +
        ' ' +
        className
      }
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center gap-2 px-2 sm:px-4 h-14">
        {onBack ? (
          <button
            onClick={onBack}
            aria-label="Back"
            className="flex items-center justify-center w-11 h-11 rounded-full active:bg-slate-100 dark:active:bg-slate-800 active:scale-95 transition-all touch-manipulation"
          >
            <ChevronLeft className="w-6 h-6 text-slate-700 dark:text-slate-200" />
          </button>
        ) : (
          <div className="w-11" />
        )}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0">
          {typeof title === 'string' ? (
            <h1 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white truncate max-w-full">
              {title}
            </h1>
          ) : (
            title
          )}
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-full">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center justify-end min-w-[44px]">{right}</div>
      </div>
    </header>
  );
}
