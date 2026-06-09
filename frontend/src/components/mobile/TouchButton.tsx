import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
type Size = 'sm' | 'md' | 'lg';

interface TouchButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

const BASE =
  // The `touch-action: manipulation` + `select-none` combo kills the 300 ms
  // tap delay on iOS Safari and prevents double-tap-zoom. Active state uses
  // `scale-[0.97]` for tactile feedback — visible on every touch device.
  // Hover effects only kick in for fine pointers (mouse/trackpad) via the
  // `hover-fine:` variant defined in tailwind.config.
  'relative inline-flex items-center justify-center gap-2 font-semibold ' +
  'select-none touch-manipulation transition-[transform,background-color,box-shadow,opacity] duration-150 ' +
  'active:scale-[0.97] disabled:active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-violet-400 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900';

// Minimum touch target sizes (per Apple HIG / Material spec: 44 px iOS, 48 dp Android).
// We always pad to ≥48 px height with `min-h-[…]` so finger-tap accuracy is
// preserved even when developers pass small content.
const SIZE: Record<Size, string> = {
  sm: 'min-h-[40px] px-3.5 text-sm rounded-lg',
  md: 'min-h-[48px] px-5 text-base rounded-xl',
  lg: 'min-h-[56px] px-7 text-lg rounded-2xl',
};

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25 ' +
    'active:from-violet-700 active:to-fuchsia-700 active:shadow-violet-500/15',
  secondary:
    'bg-white text-slate-900 shadow-md border border-slate-200 ' +
    'active:bg-slate-50 dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:active:bg-slate-700',
  ghost:
    'bg-transparent text-slate-700 dark:text-slate-200 ' +
    'active:bg-slate-100 dark:active:bg-slate-800',
  danger:
    'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-rose-500/25 ' +
    'active:from-red-600 active:to-rose-700',
  soft:
    'bg-violet-100 text-violet-700 ' +
    'active:bg-violet-200 dark:bg-violet-500/15 dark:text-violet-200 dark:active:bg-violet-500/25',
};

/**
 * Touch-first button.
 *
 * Why this exists: most existing buttons use `hover:scale-110` etc. which
 * is dead on touch screens. This button uses `active:scale-[0.97]` so every
 * tap gets visible feedback, and reserves a ≥48 px hit area so a thumb
 * landing slightly off-centre still triggers the action.
 *
 * Hover affordances are still available for mouse/trackpad users via the
 * `hover-fine:` variant when needed at the call site.
 */
export const TouchButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  function TouchButton(
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      iconLeft,
      iconRight,
      className = '',
      children,
      disabled,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={rest.type ?? 'button'}
        disabled={disabled || loading}
        className={`${BASE} ${SIZE[size]} ${VARIANT[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...rest}
      >
        {loading ? (
          <span
            aria-hidden
            className="w-4 h-4 rounded-full border-2 border-current border-r-transparent animate-spin"
          />
        ) : (
          iconLeft
        )}
        {children}
        {iconRight}
      </button>
    );
  },
);
