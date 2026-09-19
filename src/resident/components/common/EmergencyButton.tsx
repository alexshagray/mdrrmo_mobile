import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { AlertTriangle, ShieldAlert, ArrowRight } from 'lucide-react-native';
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
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 18 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18 }).start();
  };

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
        marginHorizontal: 16,
        marginVertical: 10,
        borderRadius: 28,
        shadowColor: '#E11D48',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
        elevation: 8,
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{
          borderRadius: 28,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={['#E11D48', '#BE123C', '#9F1239']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingVertical: 24,
            paddingHorizontal: 22,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 28,
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.25)',
          }}
        >
          {/* Decorative soft circles */}
          <View
            style={{
              position: 'absolute',
              top: -30,
              left: -30,
              width: 130,
              height: 130,
              borderRadius: 65,
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: -25,
              right: -25,
              width: 110,
              height: 110,
              borderRadius: 55,
              backgroundColor: 'rgba(255,255,255,0.06)',
            }}
          />

          {/* Icon Badge */}
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: 'rgba(255,255,255,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.3)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 6,
            }}
          >
            <AlertTriangle size={36} color="#FFFFFF" strokeWidth={2.5} />
          </View>

          {/* Live Urgency Pill */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 999,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.3)',
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: '#FFFFFF',
                marginRight: 6,
              }}
            />
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
              }}
            >
              24/7 Priority Hotline
            </Text>
          </View>

          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 22,
              fontWeight: '900',
              letterSpacing: 1.5,
              marginBottom: 4,
              textAlign: 'center',
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 13,
              fontWeight: '500',
              textAlign: 'center',
              maxWidth: '85%',
            }}
          >
            {subtitle}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}
