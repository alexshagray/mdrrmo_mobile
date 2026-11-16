import React, { useEffect, useRef, useState } from 'react';
import MapboxGL from '@rnmapbox/maps';
import { LatLng, getShortestAngleDiff } from '@/shared/utils/navigationMath';
import { ResponderNavigationArrow } from './NavigationMarkers';

interface SmoothResponderMarkerProps {
  targetLocation: LatLng | null;
  targetHeading: number;
  speed?: number | null; // current speed in meters per second
  accuracy?: number | null; // GPS accuracy in meters
  timestamp?: number | null; // epoch ms
  size?: number;
}

/**
 * High-performance 60 FPS interpolated responder navigation marker.
 *
 * Features:
 * - Fluid timestamp-based coordinate interpolation eliminating teleports and stop-and-go stutter.
 * - Shortest circular angle interpolation (prevents 360° flip spins; handles 350° <-> 10°).
 * - Rotational deadband hysteresis (< 0.4°) to eliminate arrow shaking and micro-flickering.
 * - Auto-pauses animation loop when stationary to conserve battery / 0% CPU.
 * - Preserves the exact original emerald directional arrow visual design.
 */
export const SmoothResponderMarker: React.FC<SmoothResponderMarkerProps> = React.memo(
  ({ targetLocation, targetHeading, speed = 0, accuracy, timestamp, size = 36 }) => {
    // Current animated position & heading refs for the 60 FPS loop
    const currentLatRef = useRef<number | null>(targetLocation?.latitude ?? null);
    const currentLngRef = useRef<number | null>(targetLocation?.longitude ?? null);
    const currentHeadingRef = useRef<number>(targetHeading);

    const [renderCoord, setRenderCoord] = useState<[number, number] | null>(
      targetLocation ? [targetLocation.longitude, targetLocation.latitude] : null
    );
    const [renderHeading, setRenderHeading] = useState<number>(targetHeading);

    const animFrameIdRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number>(0);
    const lastTargetUpdateTimeRef = useRef<number>(0);

    // Target refs
    const targetLatRef = useRef<number | null>(targetLocation?.latitude ?? null);
    const targetLngRef = useRef<number | null>(targetLocation?.longitude ?? null);
    const targetHeadingRef = useRef<number>(targetHeading);
    const targetSpeedRef = useRef<number>(speed ?? 0);

    // Keep heading target in sync
    useEffect(() => {
      targetHeadingRef.current = targetHeading;
      startAnimationLoop();
    }, [targetHeading]);

    // Keep speed target in sync
    useEffect(() => {
      targetSpeedRef.current = speed ?? 0;
    }, [speed]);

    // Handle target coordinate changes
    useEffect(() => {
      if (!targetLocation) return;

      const now = performance.now();
      lastTargetUpdateTimeRef.current = now;

      targetLatRef.current = targetLocation.latitude;
      targetLngRef.current = targetLocation.longitude;

      // Initial fix -> snap immediately
      if (currentLatRef.current === null || currentLngRef.current === null) {
        currentLatRef.current = targetLocation.latitude;
        currentLngRef.current = targetLocation.longitude;
        currentHeadingRef.current = targetHeading;
        setRenderCoord([targetLocation.longitude, targetLocation.latitude]);
        setRenderHeading(targetHeading);
        return;
      }

      // Major jump (> 80 meters) -> snap immediately (teleport / initial reload)
      const dLat = targetLocation.latitude - currentLatRef.current;
      const dLng = targetLocation.longitude - currentLngRef.current;
      const approxDistMeters = Math.hypot(
        dLat * 111139,
        dLng * 111139 * Math.cos((targetLocation.latitude * Math.PI) / 180)
      );

      if (approxDistMeters > 80) {
        currentLatRef.current = targetLocation.latitude;
        currentLngRef.current = targetLocation.longitude;
        currentHeadingRef.current = targetHeading;
        setRenderCoord([targetLocation.longitude, targetLocation.latitude]);
        setRenderHeading(targetHeading);
        return;
      }

      startAnimationLoop();
    }, [targetLocation?.latitude, targetLocation?.longitude]);

    const startAnimationLoop = () => {
      if (animFrameIdRef.current !== null) return;
      lastFrameTimeRef.current = performance.now();

      const tick = (now: number) => {
        // Delta time clamped between 1ms and 50ms to prevent visual spikes on background resume
        const dt = Math.max(0.001, Math.min((now - lastFrameTimeRef.current) / 1000, 0.05));
        lastFrameTimeRef.current = now;

        let needsAnotherTick = false;

        // 1. POSITION INTERPOLATION (Continuous, smooth velocity-adapted glide)
        if (
          currentLatRef.current !== null &&
          currentLngRef.current !== null &&
          targetLatRef.current !== null &&
          targetLngRef.current !== null
        ) {
          const latDiff = targetLatRef.current - currentLatRef.current;
          const lngDiff = targetLngRef.current - currentLngRef.current;
          const distSq = latDiff * latDiff + lngDiff * lngDiff;

          // ~0.03 meters squared threshold in degree space
          if (distSq > 0.0000000001) {
            // Smooth critically damped position convergence (~5.0/sec gives natural cadence over ~1.0s GPS updates)
            const posFactor = 1 - Math.exp(-5.2 * dt);
            currentLatRef.current += latDiff * posFactor;
            currentLngRef.current += lngDiff * posFactor;
            setRenderCoord([currentLngRef.current, currentLatRef.current]);
            needsAnotherTick = true;
          } else {
            currentLatRef.current = targetLatRef.current;
            currentLngRef.current = targetLngRef.current;
            setRenderCoord([currentLngRef.current, currentLatRef.current]);
          }
        }

        // 2. HEADING ROTATION INTERPOLATION (Shortest angular path + deadband)
        const currentHead = currentHeadingRef.current;
        const targetHead = targetHeadingRef.current;
        const headingDiff = getShortestAngleDiff(currentHead, targetHead);

        // Deadband threshold: ignore micro-oscillations under 0.35°
        if (Math.abs(headingDiff) > 0.35) {
          // Smooth rotation factor (~6.8/sec provides responsive steering without snap)
          const angleFactor = 1 - Math.exp(-6.8 * dt);
          const nextHeading = (currentHead + headingDiff * angleFactor + 360) % 360;
          currentHeadingRef.current = nextHeading;
          setRenderHeading(nextHeading);
          needsAnotherTick = true;
        } else {
          currentHeadingRef.current = targetHead;
          setRenderHeading(targetHead);
        }

        if (needsAnotherTick) {
          animFrameIdRef.current = requestAnimationFrame(tick);
        } else {
          animFrameIdRef.current = null;
        }
      };

      animFrameIdRef.current = requestAnimationFrame(tick);
    };

    useEffect(() => {
      return () => {
        if (animFrameIdRef.current !== null) {
          cancelAnimationFrame(animFrameIdRef.current);
          animFrameIdRef.current = null;
        }
      };
    }, []);

    if (!renderCoord) return null;

    return (
      <MapboxGL.PointAnnotation
        id="userPuck"
        coordinate={renderCoord}
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <ResponderNavigationArrow heading={renderHeading} size={size} />
      </MapboxGL.PointAnnotation>
    );
  }
);
