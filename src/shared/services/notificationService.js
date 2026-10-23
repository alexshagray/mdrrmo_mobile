import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// NOTE: setNotificationHandler is set once in MissionAlarmContext.tsx.
// Do NOT set it here to avoid duplicate/override conflicts.

class NotificationService {
  /**
   * Setup Android notification channels.
   * MISSION_ALARM channel uses the custom alarm.mp3 sound so Android plays it
   * automatically when a push notification arrives - even when app is backgrounded.
   */
  async setupNotificationChannels() {
    if (Platform.OS !== 'android') return;

    // Default channel for regular notifications
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General Notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#208AEF',
    });

    // HIGH-PRIORITY mission alarm channel
    // Emergency alerts use MAX importance and custom vibration pattern.
    // The alarm siren (alarm.mp3) is played reliably by expo-audio in MissionAlarmContext.
    const missionChannelOptions = {
      name: 'Mission Alarm',
      description: 'Emergency mission alerts with high-priority vibration',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 600, 300, 600, 300, 1000],
      lightColor: '#EF4444',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,              // Bypass Do Not Disturb for emergencies
      enableVibrate: true,
    };

    try {
      await Notifications.setNotificationChannelAsync('mission_alarm_v2', missionChannelOptions);
    } catch (e) {
      console.warn('[NotificationService] Failed to set mission_alarm_v2 channel:', e);
    }
  }

  /**
   * Request permissions and retrieve Expo Push Token
   */
  async registerForPushNotificationsAsync() {
    let token;

    // Setup channels first
    await this.setupNotificationChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return null;
    }

    try {
      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Expo Push Token:', token);
    } catch (e) {
      const msg = e?.message || String(e);
      if (msg.includes('FirebaseApp is not initialized') || msg.includes('googleServicesFile')) {
        console.log('[PushNotifications] Firebase not initialized in dev build.');
      } else {
        console.error('Error getting push token', e);
      }
    }

    return token;
  }

  /**
   * Setup listeners for incoming foreground notifications and user taps
   */
  setupNotificationListeners(onReceived, onTapped) {
    const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
      if (onReceived) onReceived(notification);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      if (onTapped) onTapped(response);
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }
}

export const notificationService = new NotificationService();
