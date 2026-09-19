import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  /**
   * Request permissions and retrieve Expo Push Token
   */
  async registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

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
      // In a real app, you would pass your Expo project ID here
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
