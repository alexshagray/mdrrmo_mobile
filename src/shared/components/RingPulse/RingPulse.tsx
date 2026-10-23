import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface RingPulseProps {
  /**
   * Diameter of the loader ring in pixels.
   * @default 56
   */
  size?: number;

  /**
   * Accent color for the spinning arc and ripple.
   * @default '#7F77DD'
   */
  color?: string;

  /**
   * Stroke width of the circular track and spinning arc.
   * @default 4
   */
  strokeWidth?: number;

  /**
   * Neutral background track color that adapts to light/dark surfaces.
   * @default 'rgba(148, 163, 184, 0.28)'
   */
  trackColor?: string;

  /**
   * Ripple color (defaults to accent color).
   */
  rippleColor?: string;

  /**
   * Optional label text shown beneath the animation.
   */
  message?: string;

  /**
   * Text color for the optional label.
   * @default '#64748B'
   */
  messageColor?: string;

  /**
   * Optional custom style for the wrapper container.
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * RingPulse - Modern 60fps lightweight loading animation.
 *
 * Features:
 * - 4px circular track ring in neutral adaptive gray.
 * - Single accent arc with rounded caps (#7F77DD) spinning at 1.1s linear.
 * - Dynamic arc stretch/shrink from 17% to 63% at 1.4s ease-in-out.
 * - Soft expanding 2px ripple expanding to 2x at 1.6s ease-out with fading opacity.
 */
export const RingPulse: React.FC<RingPulseProps> = ({
  size = 56,
  color = '#7F77DD',
  strokeWidth = 4,
  trackColor = 'rgba(148, 163, 184, 0.28)',
  rippleColor,
  message,
  messageColor = '#64748B',
  style,
}) => {
  const center = size / 2;
  const radius = Math.max(1, (size - strokeWidth) / 2);
  const circumference = 2 * Math.PI * radius;

  // 1. Continuous Linear Spin (360° every 1.1s)
  const rotation = useSharedValue(0);

  // 2. Arc Stretch & Shrink (1.4s ease-in-out full cycle)
  const stretch = useSharedValue(0);

  // 3. Soft Ripple Expansion (1.6s ease-out, expanding to 2x & fading 50% to 0)
  const ripple = useSharedValue(0);

  useEffect(() => {
    // 1.1s linear rotation
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1100,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    // 1.4s ease-in-out arc stretch (0.7s stretch + 0.7s shrink)
    stretch.value = withRepeat(
      withTiming(1, {
        duration: 700,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    // 1.6s ease-out ripple expansion & fade
    ripple.value = withRepeat(
      withTiming(1, {
        duration: 1600,
        easing: Easing.out(Easing.ease),
      }),
      -1,
      false
    );
  }, [rotation, stretch, ripple]);

  // Animated rotation style for the spinning arc
  const animatedArcStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Animated stroke length (17% to 63% of circumference)
  const animatedArcProps = useAnimatedProps(() => {
    // 17% arc = offset of C * (1 - 0.17) = C * 0.83
    // 63% arc = offset of C * (1 - 0.63) = C * 0.37
    const offset = interpolate(
      stretch.value,
      [0, 1],
      [circumference * 0.83, circumference * 0.37]
    );

    return {
      strokeDashoffset: offset,
    };
  });

  // Animated ripple transform & fade
  const animatedRippleStyle = useAnimatedStyle(() => {
    const scale = interpolate(ripple.value, [0, 1], [1, 2]);
    const opacity = interpolate(ripple.value, [0, 1], [0.5, 0]);

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const actualRippleColor = rippleColor || color;

  return (
    <View style={[styles.outerContainer, style]}>
      <View style={[styles.spinnerWrapper, { width: size, height: size }]}>
        {/* Soft Background Ripple (Behind Ring) */}
        <Animated.View
          style={[
            styles.rippleRing,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: actualRippleColor,
            },
            animatedRippleStyle,
          ]}
        />

        {/* Static Neutral Circular Track Ring */}
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
        </Svg>

        {/* Dynamic Spinning & Stretching Accent Arc */}
        <Animated.View style={[StyleSheet.absoluteFill, animatedArcStyle]}>
          <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
            <AnimatedCircle
              cx={center}
              cy={center}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={[circumference, circumference]}
              animatedProps={animatedArcProps}
              fill="none"
            />
          </Svg>
        </Animated.View>
      </View>

      {/* Optional Loading Label */}
      {Boolean(message) && (
        <Text style={[styles.labelText, { color: messageColor }]}>
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  spinnerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  rippleRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  labelText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default RingPulse;
