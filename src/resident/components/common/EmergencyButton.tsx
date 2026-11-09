import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { ShieldAlert, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface EmergencyButtonProps {
  onPress: () => void;
  title?: string;
  subtitle?: string;
}

export function EmergencyButton({
  onPress,
  title = 'REPORT EMERGENCY',
  subtitle = 'Tap for immediate dispatch & medical rescue',
}: EmergencyButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 20 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  };

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
        marginVertical: 8,
        borderRadius: 24,
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.32,
        shadowRadius: 14,
        elevation: 6,
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel="Report Emergency. Tap for immediate dispatch and medical rescue"
        style={{
          borderRadius: 24,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={['#EF4444', '#DC2626', '#B91C1C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingVertical: 22,
            paddingHorizontal: 20,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 24,
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.3)',
          }}
        >
          {/* Subtle Ambient Decorative Circles */}
          <View
            style={{
              position: 'absolute',
              top: -35,
              left: -35,
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: -30,
              right: -30,
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
            }}
          />

          {/* Top Live Badge */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.16)',
              paddingHorizontal: 12,
              paddingVertical: 4.5,
              borderRadius: 999,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.25)',
            }}
          >
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: '#FEF08A',
                marginRight: 7,
              }}
            />
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.1,
                textTransform: 'uppercase',
              }}
            >
              24/7 Priority Emergency Hotline
            </Text>
          </View>

          {/* Icon Badge */}
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.18)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              borderWidth: 1.5,
              borderColor: 'rgba(255, 255, 255, 0.32)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.18,
              shadowRadius: 5,
            }}
          >
            <ShieldAlert size={30} color="#FFFFFF" strokeWidth={2.4} />
          </View>

          {/* Main Action Title */}
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 23,
              fontWeight: '900',
              letterSpacing: 1.4,
              marginBottom: 4,
              textAlign: 'center',
            }}
          >
            {title}
          </Text>

          {/* Supporting Description */}
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.92)',
              fontSize: 12.5,
              fontWeight: '600',
              textAlign: 'center',
              lineHeight: 17,
              maxWidth: '90%',
            }}
          >
            {subtitle}
          </Text>

          {/* Interactive Dispatch Indicator Pill */}
          <View
            style={{
              marginTop: 14,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.22)',
              paddingHorizontal: 15,
              paddingVertical: 7,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.35)',
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                marginRight: 6,
              }}
            >
              Tap to Request Immediate Rescue
            </Text>
            <ArrowRight size={13} color="#FFFFFF" strokeWidth={2.8} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}
