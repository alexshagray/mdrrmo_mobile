import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { updateDispatchStatus } from '../api/dispatches';

/**
 * Calculates distance between two coordinates in meters using Haversine formula
 */
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; 
};

export function useGpsStatusTransition(dispatchId, currentStatus, incidentCoords, ARRIVAL_RADIUS_METERS = 50) {
  const [distance, setDistance] = useState(null);
  const isTransitioning = useRef(false);

  useEffect(() => {
    // Only monitor if we are 'en_route' and have coordinates
    if (currentStatus !== 'en_route' || !incidentCoords || !incidentCoords.latitude || !incidentCoords.longitude) {
      return;
    }

    let subscription = null;

    const startMonitoring = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000, 
          distanceInterval: 10,
        },
        async (location) => {
          const currentLat = location.coords.latitude;
          const currentLon = location.coords.longitude;
          const incLat = parseFloat(incidentCoords.latitude);
          const incLon = parseFloat(incidentCoords.longitude);

          const distMeters = getDistanceInMeters(currentLat, currentLon, incLat, incLon);
          setDistance(Math.round(distMeters));

          // If within the arrival radius and we haven't already transitioned
          if (distMeters <= ARRIVAL_RADIUS_METERS && !isTransitioning.current) {
            isTransitioning.current = true;
            try {
              console.log(`Arrived within ${ARRIVAL_RADIUS_METERS}m! Triggering status update...`);
              await updateDispatchStatus(dispatchId, 'arrived_on_scene', { latitude: currentLat, longitude: currentLon });
              // Remove listener after triggering
              if (subscription) subscription.remove();
            } catch (error) {
              console.error('Failed to trigger automatic arrival:', error);
              isTransitioning.current = false; // allow retry
            }
          }
        }
      );
    };

    startMonitoring();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [currentStatus, dispatchId, incidentCoords, ARRIVAL_RADIUS_METERS]);

  return { distance };
}
