import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Filter, FeDropShadow } from 'react-native-svg';

interface ResponderArrowProps {
  heading: number; // 0 = North, clockwise
  size?: number;
}

/**
 * Clean, directional navigation arrow for the responder vehicle.
 * - Points precisely along the bearing (0° = North).
 * - NO circular background or container.
 * - Crisp white outline and subtle drop-shadow for high contrast on all map styles.
 */
export const ResponderNavigationArrow: React.FC<ResponderArrowProps> = ({
  heading,
  size = 36,
}) => {
  return (
    <View
      style={[
        styles.arrowWrapper,
        {
          width: size,
          height: size,
          transform: [{ rotate: `${heading || 0}deg` }],
        },
      ]}
      pointerEvents="none"
    >
      <Svg width={size} height={size} viewBox="0 0 36 36">
        <Defs>
          <LinearGradient id="responderArrowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#34D399" />
            <Stop offset="100%" stopColor="#059669" />
          </LinearGradient>
        </Defs>

        {/* Outer Shadow & White Stroke for High Contrast */}
        <Path
          d="M18 2 L33 32 L18 24 L3 32 Z"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Vibrant Emerald Directional Arrow */}
        <Path
          d="M18 2 L33 32 L18 24 L3 32 Z"
          fill="url(#responderArrowGrad)"
          stroke="#047857"
          strokeWidth="1"
          strokeLinejoin="round"
        />

        {/* Subtle 3D Center Crease for realistic navigation look */}
        <Path
          d="M18 2 L18 24"
          stroke="#A7F3D0"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity={0.8}
        />
      </Svg>
    </View>
  );
};

interface IncidentPinProps {
  size?: number;
}

/**
 * Distinctive emergency incident destination pin.
 * - Pin tip precisely anchors at the coordinate location.
 * - NO circular bubble or container.
 * - High-contrast red/amber styling with emergency warning glyph.
 */
export const IncidentLocationPin: React.FC<IncidentPinProps> = ({ size = 42 }) => {
  const width = size;
  const height = size * 1.25;

  return (
    <View style={[styles.pinWrapper, { width, height }]} pointerEvents="none">
      <Svg width={width} height={height} viewBox="0 0 40 50">
        <Defs>
          <LinearGradient id="incidentPinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#EF4444" />
            <Stop offset="100%" stopColor="#B91C1C" />
          </LinearGradient>
        </Defs>

        {/* Pin Teardrop Body with White Casing */}
        <Path
          d="M20 2 C9.5 2 1 10.5 1 21 C1 32 17 46 20 48.5 C23 46 39 32 39 21 C39 10.5 30.5 2 20 2 Z"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        <Path
          d="M20 2 C9.5 2 1 10.5 1 21 C1 32 17 46 20 48.5 C23 46 39 32 39 21 C39 10.5 30.5 2 20 2 Z"
          fill="url(#incidentPinGrad)"
          stroke="#991B1B"
          strokeWidth="1"
          strokeLinejoin="round"
        />

        {/* Emergency Warning Exclamation Sign inside Pin */}
        <Path
          d="M20 12 L20 24 M20 29 L20 31"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  arrowWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    // Soft shadow for elevation above map
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 8,
  },
  pinWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    // Bottom anchor
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 10,
  },
});
