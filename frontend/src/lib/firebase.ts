/**
 * Firebase Cloud Messaging (FCM) setup for push notifications.
 * Uses environment variables for configuration.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function getApp(): FirebaseApp {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export async function initFCM(): Promise<Messaging | null> {
  if (messaging) return messaging;
  try {
    const supported = await isSupported();
    if (!supported) return null;
    messaging = getMessaging(getApp());
    return messaging;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const msg = await initFCM();
    if (!msg) return null;

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    const token = await getToken(msg, { vapidKey });
    return token;
  } catch (error) {
    console.error('FCM token error:', error);
    return null;
  }
}

export function onForegroundMessage(callback: (payload: any) => void) {
  initFCM().then(msg => {
    if (msg) {
      onMessage(msg, callback);
    }
  });
}
