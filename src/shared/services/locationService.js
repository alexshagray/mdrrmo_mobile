import * as Location from 'expo-location';

class LocationService {
  /**
   * Request location permissions
   */
  async requestPermissions() {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.warn('Foreground location permission denied');
      return false;
    }

    // Optional background tracking
    // const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    
    return true;
  }

  /**
   * Get a one-time current location (highly accurate but slower)
   */
  async getCurrentLocation() {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('Cannot get location: Permission denied.');
        return null;
      }

      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Start watching location and call the callback on updates.
   * Optimizations included: time interval and distance filter.
   */
  async startLocationWatcher(callback) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return null;

    try {
      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 10, // Or every 10 meters
        },
        (location) => {
          callback(location);
          // Future integration: send location over Reverb WebSocket here
        }
      );
      
      return locationSubscription;
    } catch (error) {
      console.error('Error starting location watcher:', error);
      return null;
    }
  }
}

export const locationService = new LocationService();
