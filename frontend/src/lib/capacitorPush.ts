/**
 * Capacitor native push notification setup.
 * Only runs on native platforms (Android/iOS).
 */

export async function initNativePush() {
  // Dynamic import to avoid bundling Capacitor in web builds
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) return;

  const { PushNotifications } = await import('@capacitor/push-notifications');
  const { LocalNotifications } = await import('@capacitor/local-notifications');

  const permResult = await PushNotifications.requestPermissions();
  if (permResult.receive !== 'granted') return;

  await PushNotifications.register();

  PushNotifications.addListener('registration', async (token) => {
    console.log('Push registration token:', token.value);
    try {
      // Register token with backend
      const { notificationsApi } = await import('../services/aipreneurApi');
      await notificationsApi.registerToken(token.value, 'android');
      localStorage.setItem('fcm_token', token.value);
    } catch (error) {
      console.error('Failed to register FCM token:', error);
    }
  });

  PushNotifications.addListener('pushNotificationReceived', async (notification) => {
    // Show local notification if app is in foreground
    await LocalNotifications.schedule({
      notifications: [{
        title: notification.title || 'AIpreneur',
        body: notification.body || '',
        id: Date.now(),
        extra: notification.data,
      }],
    });
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    const data = notification.notification.data;
    if (data?.route) {
      window.location.hash = data.route;
    }
  });
}

export async function scheduleLocalReminders() {
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) return;

  const { LocalNotifications } = await import('@capacitor/local-notifications');

  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== 'granted') return;

  // Cancel existing scheduled notifications
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel(pending);
  }

  // Schedule daily reminder at 4pm
  await LocalNotifications.schedule({
    notifications: [{
      title: 'Your shop is waiting!',
      body: "Come check on your staff and complete today's quests!",
      id: 1001,
      schedule: {
        on: { hour: 16, minute: 0 },
        repeats: true,
        allowWhileIdle: true,
      },
    }],
  });
}
