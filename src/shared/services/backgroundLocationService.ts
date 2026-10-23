import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { updateDispatchLocation } from '../api/dispatches';

// Safely load expo-task-manager with try/catch to avoid crashing in Expo Go or environments without native module
let TaskManager: typeof import('expo-task-manager') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  TaskManager = require('expo-task-manager');
} catch {
  // ExpoTaskManager is not bundled (e.g. standard Expo Go app or Web)
  TaskManager = null;
}

export const BACKGROUND_LOCATION_TASK = 'MDRRMO_BACKGROUND_LOCATION_TASK';
const STORAGE_KEY = '@mdrrmo_active_dispatch_tracking';

interface TrackingState {
  dispatchId: string | number;
  isDriver?: boolean;
}

let lastBgSentTime = 0;

// Register background task at the module root level if TaskManager native module is available
if (TaskManager && typeof TaskManager.defineTask === 'function') {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[BackgroundLocation] Task error:', error.message);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (!locations || locations.length === 0) return;

    const latest = locations[locations.length - 1];
    if (!latest?.coords) return;

    try {
      const stateStr = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stateStr) return;

      const state: TrackingState = JSON.parse(stateStr);
      if (!state.dispatchId) return;

      const now = Date.now();
      // Throttle background calls to at most once every 3 seconds unless significant movement
      if (now - lastBgSentTime < 3000) {
        return;
      }

      await (updateDispatchLocation as any)(state.dispatchId, {
        latitude: latest.coords.latitude,
        longitude: latest.coords.longitude,
        heading: typeof latest.coords.heading === 'number' && latest.coords.heading >= 0 ? latest.coords.heading : null,
        accuracy: typeof latest.coords.accuracy === 'number' && latest.coords.accuracy >= 0 ? latest.coords.accuracy : null,
        timestamp: new Date(latest.timestamp || Date.now()).toISOString(),
      });

      lastBgSentTime = now;
    } catch (err: any) {
      if (err?.response?.status === 422) {
        // Mission is inactive, stop task cleanly
        await stopBackgroundLocation();
      } else {
        console.warn('[BackgroundLocation] Transmit error:', err?.message || err);
      }
    }
  }
});
}

/**
 * Start background location tracking for an active emergency dispatch
 */
export async function startBackgroundLocation(dispatchId: string | number, isDriver: boolean = true): Promise<boolean> {
  if (Platform.OS === 'web' || !TaskManager) return false;

  try {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      console.warn('[BackgroundLocation] Foreground permission denied');
      return false;
    }

    // Save tracking details so TaskManager can read them even in background
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ dispatchId, isDriver, startedAt: Date.now() })
    );

    // Request background permission
    let hasBgPermission = false;
    try {
      const bg = await Location.requestBackgroundPermissionsAsync();
      hasBgPermission = bg.status === 'granted';
    } catch (e) {
      console.warn('[BackgroundLocation] Background permission request failed:', e);
    }

    if (!hasBgPermission) {
      console.log('[BackgroundLocation] Background permission not granted. Running in foreground mode.');
      return false;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (!isRegistered) {
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: isDriver ? Location.Accuracy.High : Location.Accuracy.Balanced,
        timeInterval: isDriver ? 4000 : 12000,
        distanceInterval: isDriver ? 8 : 20,
        deferredUpdatesInterval: 4000,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'MDRRMO Active Emergency Dispatch',
          notificationBody: 'Transmitting responder location to Command Center...',
          notificationColor: '#ef4444',
        },
      });
      console.log(`[BackgroundLocation] Started background tracking for dispatch ${dispatchId}`);
    }

    return true;
  } catch (error) {
    console.warn('[BackgroundLocation] Failed to start background updates:', error);
    return false;
  }
}

/**
 * Stop background location updates when dispatch completes, cancels, or unmounts
 */
export async function stopBackgroundLocation(): Promise<void> {
  if (Platform.OS === 'web' || !TaskManager) return;

  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('[BackgroundLocation] Stopped background location tracking.');
    }
  } catch (error) {
    console.warn('[BackgroundLocation] Error stopping background task:', error);
  }
}

/**
 * Check if background location task is currently running
 */
export async function isBackgroundLocationRunning(): Promise<boolean> {
  if (Platform.OS === 'web' || !TaskManager) return false;
  try {
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}
