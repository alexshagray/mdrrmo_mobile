import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { LatLng, getShortestAngleDiff } from '@/shared/utils/navigationMath';
import { ResponderNavigationArrow } from './NavigationMarkers';

export interface SmoothResponderMarkerProps {
  id?: string;
  targetLocation: LatLng | null;
  targetHeading: number; // Geographic travel bearing [0, 360)
  cameraHeading?: number; // Map camera heading [0, 360)
  speed?: number | null; // current speed in meters per second
  accuracy?: number | null; // GPS accuracy in meters
  timestamp?: number | null; // epoch ms
  size?: number;
  label?: string; // Optional unit name label (e.g. "Alpha 1")
}

/**
 * High-performance 60 FPS interpolated responder navigation marker.
 *
 * Features:
 * - Fluid timestamp-based coordinate interpolation eliminating teleports and stop-and-go stutter.
 * - Synchronizes geographic route bearing with map camera bearing to eliminate POV distortion.
 * - Shortest circular angle interpolation (prevents 360° flip spins; handles 350° <-> 10°).
 * - Rotational deadband hysteresis (< 0.3°) to eliminate arrow shaking and micro-flickering.
 * - Auto-pauses animation loop when stationary to conserve battery / 0% CPU.
 * - Always layered above route lines with high z-index and elevation.
 * - Supports optional live unit name pill below the arrow.
 */
export const SmoothResponderMarker: React.FC<SmoothResponderMarkerProps> = React.memo(
  ({
    id = 'responderPuck',
    targetLocation,
    targetHeading,
    cameraHeading = 0,
    speed = 0,
    accuracy,
    timestamp,
    size = 36,
    label,
  }) => {
    // Current animated position & heading refs for the 60 FPS loop
    const currentLatRef = useRef<number | null>(targetLocation?.latitude ?? null);
    const currentLngRef = useRef<number | null>(targetLocation?.longitude ?? null);
    const currentHeadingRef = useRef<number>(targetHeading);
    const cameraHeadingRef = useRef<number>(cameraHeading ?? 0);

    const [renderCoord, setRenderCoord] = useState<[number, number] | null>(
      targetLocation ? [targetLocation.longitude, targetLocation.latitude] : null
    );

    // Initial visual screen angle: (geographicHeading - cameraHeading)
    const initialVisualAngle = ((targetHeading - (cameraHeading ?? 0)) % 360 + 360) % 360;
    const [renderHeading, setRenderHeading] = useState<number>(initialVisualAngle);

    const animFrameIdRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number>(0);
    const lastTargetUpdateTimeRef = useRef<number>(0);

    // Target refs
    const targetLatRef = useRef<number | null>(targetLocation?.latitude ?? null);
    const targetLngRef = useRef<number | null>(targetLocation?.longitude ?? null);
    const targetHeadingRef = useRef<number>(targetHeading);
    const targetSpeedRef = useRef<number>(speed ?? 0);

    // Keep camera heading in sync and immediately adjust visual screen orientation
    useEffect(() => {
      const cam = cameraHeading ?? 0;
      cameraHeadingRef.current = cam;
      const visualScreenAngle = ((currentHeadingRef.current - cam) % 360 + 360) % 360;
      setRenderHeading(visualScreenAngle);
    }, [cameraHeading]);

    // Keep geographic heading target in sync
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
        const visualScreenAngle = ((targetHeading - (cameraHeading ?? 0)) % 360 + 360) % 360;
        setRenderHeading(visualScreenAngle);
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
        const visualScreenAngle = ((targetHeading - (cameraHeading ?? 0)) % 360 + 360) % 360;
        setRenderHeading(visualScreenAngle);
        return;
      }

      startAnimationLoop();
    }, [targetLocation?.latitude, targetLocation?.longitude]);

    const startAnimationLoop = () => {
      if (animFrameIdRef.current !== null) return;
      lastFrameTimeRef.current = performance.now();

      const tick = (now: number) => {
        // Delta time clamped between 1ms and 50ms to prevent visual spikes
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
            const posFactor = 1 - Math.exp(-5.5 * dt);
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

        // Deadband threshold: ignore micro-oscillations under 0.25°
        if (Math.abs(headingDiff) > 0.25) {
          // Smooth rotation factor (~7.5/sec provides responsive steering without snap or tilt)
          const angleFactor = 1 - Math.exp(-7.5 * dt);
          const nextHeading = (currentHead + headingDiff * angleFactor + 360) % 360;
          currentHeadingRef.current = nextHeading;

          // Screen Angle = Geographic Heading - Camera Bearing
          const visualScreenAngle = ((nextHeading - cameraHeadingRef.current) % 360 + 360) % 360;
          setRenderHeading(visualScreenAngle);
          needsAnotherTick = true;
        } else {
          currentHeadingRef.current = targetHead;
          const visualScreenAngle = ((targetHead - cameraHeadingRef.current) % 360 + 360) % 360;
          setRenderHeading(visualScreenAngle);
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
        id={id}
        coordinate={renderCoord}
        anchor={{ x: 0.5, y: 0.5 }}
        selected={true}
      >
        <View style={[styles.markerContainer, { width: size, height: size }]} pointerEvents="none">
          <ResponderNavigationArrow heading={renderHeading} size={size} />
          {label ? (
            <View style={styles.labelWrapper} pointerEvents="none">
              <View style={styles.labelPill}>
                <View style={styles.liveDot} />
                <Text style={styles.labelText}>{label}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </MapboxGL.PointAnnotation>
    );
  }
);

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 20,
  },
  labelWrapper: {
    position: 'absolute',
    top: '100%',
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    zIndex: 10000,
  },
  labelPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  labelText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
