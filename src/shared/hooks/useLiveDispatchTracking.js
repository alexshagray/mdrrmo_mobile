import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { updateDispatchLocation } from '../api/dispatches';

/**
 * Calculates distance in meters between two lat/lng pairs (Haversine formula)
 */
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

const ACTIVE_STATUSES = ['assigned', 'accepted', 'en_route', 'arrived_on_scene'];

/**
 * Hook to continuously track and transmit responder GPS for an active dispatch.
 * Automatically deactivates when the dispatch is completed, cancelled, or inactive.
 */
export function useLiveDispatchTracking(dispatchId, dispatchStatus) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [lastSentAt, setLastSentAt] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  const lastSentCoordsRef = useRef(null);
  const lastSentTimeRef = useRef(0);
  const isSendingRef = useRef(false);

  useEffect(() => {
    const isActive = dispatchId && ACTIVE_STATUSES.includes(dispatchStatus);

    if (!isActive) {
      setIsTracking(false);
      return;
    }

    let subscription = null;
    let isCancelled = false;

    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || isCancelled) {
          setIsTracking(false);
          return;
        }

        setIsTracking(true);

        // 1. Check last known position immediately
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown && !isCancelled) {
          setCurrentLocation(lastKnown.coords);
          transmitLocation(lastKnown.coords);
        }

        // 2. Watch position continuously
        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 4000,
            distanceInterval: 10,
          },
          (loc) => {
            if (isCancelled || !loc?.coords) return;
            setCurrentLocation(loc.coords);

            const now = Date.now();
            const timeSinceLastSent = now - lastSentTimeRef.current;
            const lastCoords = lastSentCoordsRef.current;

            let shouldSend = false;

            if (!lastCoords) {
              shouldSend = true;
            } else {
              const distanceMoved = getDistanceInMeters(
                lastCoords.latitude,
                lastCoords.longitude,
                loc.coords.latitude,
                loc.coords.longitude
              );

              // Transmit if:
              // 1. Moved >= 10 meters and at least 4s elapsed
              // 2. OR at least 15 seconds elapsed (heartbeat while stationary so dispatcher knows link is live)
              if (distanceMoved >= 10 && timeSinceLastSent >= 4000) {
                shouldSend = true;
              } else if (timeSinceLastSent >= 15000) {
                shouldSend = true;
              }
            }

            if (shouldSend) {
              transmitLocation(loc.coords);
            }
          }
        );

        if (isCancelled) {
          sub.remove();
        } else {
          subscription = sub;
        }
      } catch (err) {
        console.warn('Live dispatch tracking error:', err);
        setIsTracking(false);
      }
    };

    const transmitLocation = async (coords) => {
      if (isSendingRef.current || !dispatchId) return;

      isSendingRef.current = true;
      try {
        await updateDispatchLocation(dispatchId, {
          latitude: coords.latitude,
          longitude: coords.longitude,
          heading: coords.heading ?? null,
          accuracy: coords.accuracy ?? null,
          timestamp: new Date().toISOString(),
        });

        lastSentCoordsRef.current = {
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
        lastSentTimeRef.current = Date.now();
        setLastSentAt(new Date());
      } catch (err) {
        console.warn('Failed to transmit live dispatch location:', err?.message || err);
      } finally {
        isSendingRef.current = false;
      }
    };

    startTracking();

    return () => {
      isCancelled = true;
      if (subscription) {
        subscription.remove();
      }
      setIsTracking(false);
    };
  }, [dispatchId, dispatchStatus]);

  return { currentLocation, lastSentAt, isTracking };
}
