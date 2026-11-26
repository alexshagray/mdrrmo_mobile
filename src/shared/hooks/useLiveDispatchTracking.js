import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { updateDispatchLocation } from '../api/dispatches';
import { useAuth } from '../auth/authContext';
import { startBackgroundLocation, stopBackgroundLocation } from '../services/backgroundLocationService';

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
 * Driver is the primary tracking device; non-drivers operate in standby fallback mode.
 */
export function useLiveDispatchTracking(dispatchId, dispatchStatus, options = {}) {
  const { user } = useAuth();
  const driverId = options?.driverId;
  const isDriver = !driverId || !user?.id || Number(user.id) === Number(driverId);

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
      stopBackgroundLocation();
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

        // Start TaskManager background location tracking for screen-off / app minimized states
        startBackgroundLocation(dispatchId, isDriver);

        // 1. Check last known position immediately (only if reasonably accurate)
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown && !isCancelled && lastKnown.coords) {
          const initAcc = typeof lastKnown.coords.accuracy === 'number' ? lastKnown.coords.accuracy : null;
          if (initAcc === null || initAcc <= 80) {
            setCurrentLocation(lastKnown.coords);
            transmitLocation(lastKnown.coords);
          }
        }

        // 2. Watch position continuously: Driver is primary (fast & high accuracy), non-driver is standby
        const sub = await Location.watchPositionAsync(
          {
            accuracy: isDriver ? Location.Accuracy.High : Location.Accuracy.Balanced,
            timeInterval: isDriver ? 3000 : 15000,
            distanceInterval: isDriver ? 8 : 25,
          },
          (loc) => {
            if (isCancelled || !loc?.coords) return;

            // GPS Accuracy Guard: filter out inaccurate readings
            // If accuracy is worse than 50 meters, discard unless we have no valid position yet (and allow up to 100m for initial)
            const accuracy = typeof loc.coords.accuracy === 'number' ? loc.coords.accuracy : null;
            if (accuracy !== null) {
              if (lastSentCoordsRef.current && accuracy > 50) {
                return; // Suppress inaccurate GPS jitter
              }
              if (!lastSentCoordsRef.current && accuracy > 100) {
                return; // Suppress coarse tower fix on initial acquisition
              }
            }

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

              // Unrealistic Speed / Teleport Filter (~180 km/h)
              const elapsedSec = timeSinceLastSent / 1000;
              if (elapsedSec > 0 && distanceMoved > 100 && (distanceMoved / elapsedSec) > 50) {
                return; // Discard teleport coordinate jump
              }

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
      if (isSendingRef.current || !dispatchId || isCancelled) return;

      const sendTime = Date.now();
      isSendingRef.current = true;
      try {
        await updateDispatchLocation(dispatchId, {
          latitude: coords.latitude,
          longitude: coords.longitude,
          heading: (typeof coords.heading === 'number' && coords.heading >= 0) ? coords.heading : null,
          accuracy: (typeof coords.accuracy === 'number' && coords.accuracy >= 0) ? coords.accuracy : null,
          timestamp: new Date().toISOString(),
          sequence: sendTime,
        });

        lastSentCoordsRef.current = {
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
        lastSentTimeRef.current = sendTime;
        setLastSentAt(new Date(sendTime));
      } catch (err) {
        const isNetwork = err?.isNetworkError || !err.response || err.code === 'ERR_NETWORK';
        if (isNetwork) {
          // Device is offline: GPS was collected locally and queued without aborting tracking
          lastSentCoordsRef.current = {
            latitude: coords.latitude,
            longitude: coords.longitude,
          };
          lastSentTimeRef.current = Date.now();
          return;
        }

        if (err?.response?.status === 422) {
          // Inactive, completed, or cancelled mission - stop tracking cleanly without warning noise
          setIsTracking(false);
          isCancelled = true;
          stopBackgroundLocation();
          if (subscription) {
            subscription.remove();
          }
          return;
        }
        console.warn('Failed to transmit live dispatch location:', err?.response?.data?.message || err?.message || err);
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
      stopBackgroundLocation();
      setIsTracking(false);
    };
  }, [dispatchId, dispatchStatus]);

  return { currentLocation, lastSentAt, isTracking };
}
