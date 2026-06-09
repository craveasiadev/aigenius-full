/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    /* Custom screens — adds `xs` for tiny phones (≤ 360 px) and
       `watch` for round/square smartwatch viewports, plus larger
       `3xl`/`4xl` for ultra-wide desktop monitors. */
    screens: {
      'xs':    '360px',
      'watch': { 'raw': '(max-width: 320px) and (max-height: 320px)' },
      'sm':    '640px',
      'md':    '768px',
      'lg':    '1024px',
      'xl':    '1280px',
      '2xl':   '1536px',
      '3xl':   '1920px',
      '4xl':   '2560px',
      'landscape':    { 'raw': '(orientation: landscape)' },
      'portrait':     { 'raw': '(orientation: portrait)' },
      'hover-fine':   { 'raw': '(hover: hover) and (pointer: fine)' },
      'hover-coarse': { 'raw': '(hover: none) and (pointer: coarse)' },
    },
    extend: {
      /* dvh / svh / lvh height utilities — `h-screen-d` etc. */
      height: {
        'screen-d': '100dvh',
        'screen-s': '100svh',
        'screen-l': '100lvh',
      },
      minHeight: {
        'screen-d': '100dvh',
        'screen-s': '100svh',
        'screen-l': '100lvh',
      },
      maxHeight: {
        'screen-d': '100dvh',
        'screen-s': '100svh',
        'screen-l': '100lvh',
      },
      colors: {
        // Semantic surface colors (auto light/dark via CSS vars)
        surface: {
          DEFAULT: 'var(--color-surface)',
          hover: 'var(--color-surface-hover)',
          active: 'var(--color-surface-active)',
          overlay: 'var(--color-surface-overlay)',
        },
        'bg-primary': 'var(--color-bg-primary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'bg-tertiary': 'var(--color-bg-tertiary)',
        'bg-elevated': 'var(--color-bg-elevated)',

        // Text
        'txt-primary': 'var(--color-text-primary)',
        'txt-secondary': 'var(--color-text-secondary)',
        'txt-tertiary': 'var(--color-text-tertiary)',
        'txt-inverse': 'var(--color-text-inverse)',

        // Borders
        border: {
          DEFAULT: 'var(--color-border)',
          light: 'var(--color-border-light)',
          focus: 'var(--color-border-focus)',
        },

        // Accent - Indigo
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          light: 'var(--color-accent-light)',
          muted: 'var(--color-accent-muted)',
          text: 'var(--color-accent-text)',
        },

        // Status
        success: {
          DEFAULT: 'var(--color-success)',
          light: 'var(--color-success-light)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          light: 'var(--color-warning-light)',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          light: 'var(--color-error-light)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          light: 'var(--color-info-light)',
        },
      },
      fontFamily: {
        // Default body / UI font — Fredoka. Friendly rounded sans, very
        // readable for kids 9–12, used by Duolingo + similar products.
        sans: [
          'Fredoka',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        // Big-headline cartoon font — Baloo 2 is chunkier and more
        // hand-drawn. Apply via `font-display` on hero H1s only.
        display: [
          'Baloo 2',
          'Fredoka',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
      },
      backdropBlur: {
        'xl': '24px',
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'elevated': 'var(--shadow-md)',
        'focus-ring': '0 0 0 3px var(--color-accent-muted)',
      },
    },
  },
  plugins: [],
};
