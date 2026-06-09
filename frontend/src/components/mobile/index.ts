/**
 * Mobile / PWA primitives.
 *
 * Import these in every page that needs to feel native on phones:
 *
 *   import { MobileLayout, MobileHeader, TouchButton, FirstTimeTutorial }
 *     from '../components/mobile';
 *
 * They handle safe-area insets, 48 px touch targets, proper active states,
 * and respect iOS / Android web-view conventions so the same UI works
 * inside the Capacitor APK/IPA build without changes.
 */
export { MobileLayout } from './MobileLayout';
export { MobileHeader } from './MobileHeader';
export { TouchButton } from './TouchButton';
export { FirstTimeTutorial } from './FirstTimeTutorial';
export type { TutorialStep } from './FirstTimeTutorial';
