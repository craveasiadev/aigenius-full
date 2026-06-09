import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor build config.
 *
 * Why we don't set `server.hostname` to the production domain:
 *   It makes the WebView treat requests to that origin as local-asset
 *   lookups → `fetch('https://app.aigenius.com.my/...')` returns the
 *   bundled `index.html` and parsing it as JSON throws the
 *   "Unexpected token DOCTYPE" error. The WebView stays on
 *   `https://localhost`.
 *
 * Why CapacitorHttp is enabled:
 *   With the WebView on `https://localhost`, every API call to
 *   `https://app.aigenius.com.my` is cross-origin. Without backend
 *   CORS changes the browser blocks it. CapacitorHttp routes
 *   fetch/XHR through native code instead, bypassing the WebView's
 *   same-origin policy entirely.
 */
const config: CapacitorConfig = {
  appId: 'com.aigenius.aipreneur',
  appName: 'AIpreneur',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    // Native HTTP — routes fetch + XHR through the OS network stack
    // so CORS preflights never run. Required for talking to a remote
    // backend from inside a Capacitor WebView.
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0a0a1a',
      showSpinner: true,
      spinnerColor: '#ffd700',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a1a',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#ffd700',
    },
  },
};

export default config;
