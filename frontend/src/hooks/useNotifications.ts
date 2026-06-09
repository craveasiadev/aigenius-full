/**
 * Hook for managing push notifications.
 * Handles FCM registration and foreground message handling.
 */
import { useState, useEffect, useCallback } from 'react';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';

export function useNotifications() {
  const { isAuthenticated } = useGeniusAuth();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  const requestPermission = useCallback(async () => {
    try {
      // Check if we're on a native platform first
      const isNative = typeof (window as any).Capacitor !== 'undefined';

      if (isNative) {
        // Use Capacitor push notifications
        const { initNativePush, scheduleLocalReminders } = await import('../lib/capacitorPush');
        await initNativePush();
        await scheduleLocalReminders();
        setPermissionGranted(true);
      } else {
        // Use web FCM
        const { requestNotificationPermission } = await import('../lib/firebase');
        const token = await requestNotificationPermission();
        if (token) {
          setFcmToken(token);
          setPermissionGranted(true);
          // Register with backend
          const { notificationsApi } = await import('../services/aipreneurApi');
          await notificationsApi.registerToken(token, 'web');
          localStorage.setItem('fcm_token', token);
        }
      }
    } catch (error) {
      console.error('Notification permission error:', error);
    }
  }, []);

  // Check stored token on auth
  useEffect(() => {
    if (!isAuthenticated) return;
    const storedToken = localStorage.getItem('fcm_token');
    if (storedToken) {
      setFcmToken(storedToken);
      setPermissionGranted(true);
    }
  }, [isAuthenticated]);

  return { permissionGranted, fcmToken, requestPermission };
}
