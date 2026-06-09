import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { useStore } from './store/useStore';
// Eagerly seed `<html data-perf="low|mid|high">` and `<html data-shape>`
// BEFORE React paints so the perf-low + round-frame CSS layers engage
// on first frame (no flash of expensive effects or edge-clipped chrome).
// Each module's top-level block does the work.
import './hooks/useDeviceTier';
import './hooks/useScreenShape';

// Capacitor native platform initialization
async function initCapacitor() {
  const isNative = typeof (window as any).Capacitor !== 'undefined';
  if (!isNative) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0a0a1a' });
  } catch (e) {
    console.warn('StatusBar plugin not available:', e);
  }

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch (e) {
    console.warn('SplashScreen plugin not available:', e);
  }
}

initCapacitor();

function AppWithData() {
  const setCurrentUser = useStore((state) => state.setCurrentUser);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        const userForStore = {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          passwordHash: '',
          createdAt: userData.created_at || userData.createdAt,
        };
        setCurrentUser(userForStore);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWithData />
  </StrictMode>
);

// NOTE: the HTML boot loader is NOT auto-dismissed here.
//
// Earlier versions faded it out after 2 rAFs (i.e. as soon as React mounted),
// which meant React then had to render its own loading screen — and that
// React-based screen could (and did) freeze at 0 % while Rapier's WASM
// compiled on the main thread.
//
// The boot loader is now driven by window.__shopBootDone() (defined in
// index.html), called from the 3D scene the moment the player actually
// becomes visible + interactive. Routes that never mount the 3D scene
// dismiss it via window.__shopBootDone() in their own mount effect.
declare global {
  interface Window {
    __shopBootDone?: () => void;
    __shopBootHint?: (text: string) => void;
    __shopBootLabel?: (text: string) => void;
    __shopBootShow?: (label?: string, hint?: string) => void;
    __shopBootProgress?: (pct: number) => void;
    __shopBootClaimed?: boolean;
  }
}

// First JS milestone: React's main bundle has parsed + executed enough to
// reach this line. We report 15% so the bar visibly moves the moment the
// browser hands JS execution to us.
window.__shopBootProgress?.(15);
// On routes that aren't the 3D simulator, we still want the loader gone.
// Wait two rAFs (React's first paint should land by then) and check whether
// the 3D scene has claimed ownership of the loader. If not, dismiss it.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    if (!(window as any).__shopBootClaimed) {
      window.__shopBootDone?.();
    }
  });
});
