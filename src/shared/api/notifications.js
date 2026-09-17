import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_STORAGE_KEY = '@mdrrmo_resident_notifications';

export const getStoredNotifications = async () => {
  try {
    const data = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load notifications from storage:', e);
    return [];
  }
};

export const saveNotifications = async (notifications) => {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  } catch (e) {
    console.error('Failed to save notifications to storage:', e);
  }
};

export const addNotification = async (notification) => {
  try {
    const list = await getStoredNotifications();
    // Avoid duplicate IDs
    const exists = list.some((n) => n.id === notification.id);
    if (exists) return list;

    const updated = [notification, ...list];
    await saveNotifications(updated);
    return updated;
  } catch (e) {
    console.error('Failed to add notification:', e);
    return [];
  }
};

export const markNotificationRead = async (id) => {
  try {
    const list = await getStoredNotifications();
    const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
    await saveNotifications(updated);
    return updated;
  } catch (e) {
    console.error('Failed to mark notification read:', e);
    return [];
  }
};

export const markAllNotificationsRead = async () => {
  try {
    const list = await getStoredNotifications();
    const updated = list.map((n) => ({ ...n, read: true }));
    await saveNotifications(updated);
    return updated;
  } catch (e) {
    console.error('Failed to mark all notifications read:', e);
    return [];
  }
};

export const clearAllNotifications = async () => {
  try {
    await AsyncStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
    return [];
  } catch (e) {
    console.error('Failed to clear notifications:', e);
    return [];
  }
};
