import React, { useEffect, useRef, useState } from 'react';
import MapboxGL from '@rnmapbox/maps';
import { LatLng } from '@/shared/utils/navigationMath';
import { ResponderNavigationArrow } from './NavigationMarkers';

interface SmoothResponderMarkerProps {
  targetLocation: LatLng | null;
  targetHeading: number;
  size?: number;
}

/**
 * High-performance 60 FPS interpolated responder navigation marker.
 *
 * Smoothly glides between GPS updates using frame-rate independent
 * exponential interpolation, preventing jumping or teleporting.
 *
 * Smoothly rotates along the shortest circular path (handling 0° <-> 360°),
 * eliminating rotational snap jitter.
 *
 * Auto-pauses the animation loop when stationary or within threshold (< 0.05m)
 * to conserve 0% CPU.
 */
export const SmoothResponderMarker: React.FC<SmoothResponderMarkerProps> = React.memo(
  ({ targetLocation, targetHeading, size = 36 }) => {
    // Current animated position & heading refs for 60 FPS animation loop
    const currentLatRef = useRef<number | null>(targetLocation?.latitude ?? null);
    const currentLngRef = useRef<number | null>(targetLocation?.longitude ?? null);
    const currentHeadingRef = useRef<number>(targetHeading);

    const [renderCoord, setRenderCoord] = useState<[number, number] | null>(
      targetLocation ? [targetLocation.longitude, targetLocation.latitude] : null
    );
    const [renderHeading, setRenderHeading] = useState<number>(targetHeading);

    const animFrameIdRef = useRef<number | null>(null);
    const lastTimestampRef = useRef<number>(0);

    // Target refs
    const targetLatRef = useRef<number | null>(targetLocation?.latitude ?? null);
    const targetLngRef = useRef<number | null>(targetLocation?.longitude ?? null);
    const targetHeadingRef = useRef<number>(targetHeading);

    // Keep heading target in sync
    useEffect(() => {
      targetHeadingRef.current = targetHeading;
      startAnimationLoop();
    }, [targetHeading]);

    // Handle target coordinate changes
    useEffect(() => {
      if (!targetLocation) return;

      targetLatRef.current = targetLocation.latitude;
      targetLngRef.current = targetLocation.longitude;

      // Initial fix or major jump (> 100 meters) -> snap immediately
      if (currentLatRef.current === null || currentLngRef.current === null) {
        currentLatRef.current = targetLocation.latitude;
        currentLngRef.current = targetLocation.longitude;
        currentHeadingRef.current = targetHeading;
        setRenderCoord([targetLocation.longitude, targetLocation.latitude]);
        setRenderHeading(targetHeading);
        return;
      }

      const dLat = targetLocation.latitude - currentLatRef.current;
      const dLng = targetLocation.longitude - currentLngRef.current;
      const approxDistMeters = Math.hypot(
        dLat * 111139,
        dLng * 111139 * Math.cos((targetLocation.latitude * Math.PI) / 180)
      );

      if (approxDistMeters > 100) {
        // Teleport or initial load snap
        currentLatRef.current = targetLocation.latitude;
        currentLngRef.current = targetLocation.longitude;
        currentHeadingRef.current = targetHeading;
        setRenderCoord([targetLocation.longitude, targetLocation.latitude]);
        setRenderHeading(targetHeading);
        return;
      }

      startAnimationLoop();
    }, [targetLocation]);

    const startAnimationLoop = () => {
      if (animFrameIdRef.current !== null) return;
      lastTimestampRef.current = performance.now();

      const tick = (now: number) => {
        // Delta time clamped between 1ms and 50ms to prevent jumps on background resume
        const dt = Math.max(0.001, Math.min((now - lastTimestampRef.current) / 1000, 0.05));
        lastTimestampRef.current = now;

        let needsAnotherTick = false;

        // 1. Position Interpolation (smooth exponential decay)
        if (
          currentLatRef.current !== null &&
          currentLngRef.current !== null &&
          targetLatRef.current !== null &&
          targetLngRef.current !== null
        ) {
          const latDiff = targetLatRef.current - currentLatRef.current;
          const lngDiff = targetLngRef.current - currentLngRef.current;
          const distSq = latDiff * latDiff + lngDiff * lngDiff;

          // ~0.05 meters squared threshold in degree space
          if (distSq > 0.0000000002) {
            // Smooth easing factor (~8.5 per sec)
            const posFactor = 1 - Math.exp(-8.5 * dt);
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

        // 2. Heading Rotation Interpolation (shortest angular path)
        const currentHead = currentHeadingRef.current;
        const targetHead = targetHeadingRef.current;
        const headingDiff = ((targetHead - currentHead + 540) % 360) - 180;

        if (Math.abs(headingDiff) > 0.4) {
          const angleFactor = 1 - Math.exp(-9.0 * dt);
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

