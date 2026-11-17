import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { LatLng, getShortestAngleDiff, getDistance } from '@/shared/utils/navigationMath';
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
 * High-performance, crash-proof responder navigation marker.
 *
 * Features:
 * - Direct, stable coordinate updates on GPS fixes with deadband threshold.
 * - Angle deadband (1.5°) prevents micro-jitter and eliminates Android native Bitmap allocation churn.
 * - Synchronizes with camera heading when map rotates.
 * - No selected={true} callout thrashing (which triggers native Android Mapbox crashes).
 * - High-contrast emerald directional arrow and optional unit name badge.
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
    const lastCoordRef = useRef<LatLng | null>(targetLocation);

    const [renderCoord, setRenderCoord] = useState<[number, number] | null>(
      targetLocation ? [targetLocation.longitude, targetLocation.latitude] : null
    );

    // Initial visual screen angle: (geographicHeading - cameraHeading)
    const initialVisualAngle = ((targetHeading - (cameraHeading ?? 0)) % 360 + 360) % 360;
    const [renderHeading, setRenderHeading] = useState<number>(initialVisualAngle);

    // Handle coordinate changes with distance deadband
    useEffect(() => {
      if (!targetLocation) return;

      if (!lastCoordRef.current) {
        lastCoordRef.current = targetLocation;
        setRenderCoord([targetLocation.longitude, targetLocation.latitude]);
        return;
      }

      const dist = getDistance(
        lastCoordRef.current.latitude,
        lastCoordRef.current.longitude,
        targetLocation.latitude,
        targetLocation.longitude
      );

      // Only update if moved at least 0.25 meters (filters stationary GPS jitter and saves native memory)
      if (dist >= 0.25) {
        lastCoordRef.current = targetLocation;
        setRenderCoord([targetLocation.longitude, targetLocation.latitude]);
      }
    }, [targetLocation?.latitude, targetLocation?.longitude]);

    // Handle heading / camera rotation with angular deadband
    useEffect(() => {
      const cam = cameraHeading ?? 0;
      const targetScreenAngle = ((targetHeading - cam) % 360 + 360) % 360;
      const diff = Math.abs(getShortestAngleDiff(renderHeading, targetScreenAngle));

      // 1.5° deadband prevents micro-oscillations and stops continuous native Bitmap re-allocation
      if (diff >= 1.5) {
        setRenderHeading(targetScreenAngle);
      }
    }, [targetHeading, cameraHeading]);

    if (!renderCoord) return null;

    return (
      <MapboxGL.MarkerView
        id={id}
        coordinate={renderCoord}
        anchor={{ x: 0.5, y: 0.5 }}
        allowOverlap={true}
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
      </MapboxGL.MarkerView>
    );
  }
);

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrapper: {
    position: 'absolute',
    top: '100%',
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
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
