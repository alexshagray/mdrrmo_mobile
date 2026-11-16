import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { registerDeviceTokenApi, updatePushTokenApi } from '../api/auth';

// NOTE: setNotificationHandler is configured globally in MissionAlarmContext.tsx

class NotificationService {
  /**
   * Setup Android notification channels.
   * Emergency Dispatch channel uses MAX importance, custom vibration,
   * public lockscreen visibility, and alarm audio for reliable alert delivery.
   */
  async setupNotificationChannels() {
    if (Platform.OS !== 'android') return;

    // Default channel for general notifications
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General Notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#208AEF',
    });

    // Dedicated EMERGENCY DISPATCH Channel (Required by FCM HTTP v1)
    const emergencyChannelOptions = {
      name: 'Emergency Dispatch',
      description: 'Critical incoming emergency mission dispatches for responders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 600, 300, 600, 300, 1000],
      lightColor: '#DC2626',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true, // Allow emergency dispatches to sound even if Do Not Disturb is enabled
      sound: 'alarm',  // maps to alarm.mp3 in Android res/raw or assets
      enableVibrate: true,
      showBadge: true,
    };

    try {
      await Notifications.setNotificationChannelAsync('emergency_dispatch', emergencyChannelOptions);
      // Backwards compatibility alias
      await Notifications.setNotificationChannelAsync('mission_alarm_v2', emergencyChannelOptions);
    } catch (e) {
      console.warn('[NotificationService] Failed to set emergency_dispatch channel:', e);
    }
  }

  /**
   * Request notification permissions and register both Native FCM Token and Expo Token
   */
  async registerForPushNotificationsAsync() {
    if (!Device.isDevice) {
      console.log('[NotificationService] Running on simulator/emulator; native push tokens require a physical device.');
    }

    // 1. Setup required Android notification channels
    await this.setupNotificationChannels();

    // 2. Request Android 13+ POST_NOTIFICATIONS permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[NotificationService] Notification permission was not granted by user.');
      return null;
    }

    let nativeFcmToken = null;
    let expoPushToken = null;

    // 3. Obtain Native Device Push Token (FCM Registration Token)
    try {
      const deviceTokenResult = await Notifications.getDevicePushTokenAsync();
      if (deviceTokenResult?.data) {
        nativeFcmToken = typeof deviceTokenResult.data === 'string'
          ? deviceTokenResult.data
          : String(deviceTokenResult.data);

        console.log('[NotificationService] Native FCM Device Token acquired:', nativeFcmToken.substring(0, 25) + '...');

        // Register Native FCM Token with Laravel backend
        await registerDeviceTokenApi({
          token: nativeFcmToken,
          device_type: Platform.OS,
          device_name: Device.modelName || Device.deviceName || 'Android Device',
        });
      }
    } catch (e) {
      const msg = e?.message || String(e);
      if (msg.includes('FirebaseApp is not initialized') || msg.includes('googleServicesFile')) {
        console.log('[NotificationService] google-services.json not configured in dev client yet.');
      } else {
        console.warn('[NotificationService] Error acquiring native device push token:', e);
      }
    }

    // 4. Obtain Expo Push Token as secondary fallback
    try {
      const projectId =
        process.env.EXPO_PUBLIC_PROJECT_ID ||
        Constants?.expoConfig?.extra?.eas?.projectId ||
        Constants?.easConfig?.projectId;

      const expoTokenResult = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      if (expoTokenResult?.data) {
        expoPushToken = expoTokenResult.data;
        await updatePushTokenApi(expoPushToken);
      }
    } catch (e) {
      // Quiet fallback
    }

    return {
      fcmToken: nativeFcmToken,
      expoToken: expoPushToken,
    };
  }

  /**
   * Check if app was opened from cold start by tapping an emergency notification
   */
  async checkInitialNotification(onTapped) {
    try {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response && onTapped) {
        onTapped(response);
      }
    } catch (e) {
      console.warn('[NotificationService] Error checking initial notification response:', e);
    }
  }

  /**
   * Setup listeners for incoming foreground notifications and user taps
   */
  setupNotificationListeners(onReceived, onTapped) {
    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      if (onReceived) onReceived(notification);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (onTapped) onTapped(response);
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }
}

export const notificationService = new NotificationService();
