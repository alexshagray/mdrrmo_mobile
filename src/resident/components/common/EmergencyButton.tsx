import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

interface EmergencyButtonProps {
  onPress: () => void;
  title?: string;
  subtitle?: string;
}

export function EmergencyButton({
  onPress,
  title = 'REPORT EMERGENCY',
  subtitle = 'Tap here for immediate assistance',
}: EmergencyButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 15 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 15 }).start();
  };

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 24,
        shadowColor: '#f43f5e',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.38,
        shadowRadius: 18,
        elevation: 10,
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{
          backgroundColor: '#F43F5E',
          borderRadius: 24,
          paddingVertical: 26,
          paddingHorizontal: 24,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <View
          style={{
            position: 'absolute',
            top: -30,
            left: -30,
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: 'rgba(255,255,255,0.06)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: -20,
            right: -20,
            width: 90,
            height: 90,
            borderRadius: 45,
            backgroundColor: 'rgba(255,255,255,0.06)',
          }}
        />

        {/* Icon ring */}
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: 'rgba(255,255,255,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.2)',
          }}
        >
          <AlertTriangle size={40} color="#FFFFFF" strokeWidth={2.25} />
        </View>

        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 22,
            fontWeight: '800',
            letterSpacing: 2,
            marginBottom: 4,
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: 13,
            fontWeight: '500',
            textAlign: 'center',
          }}
        >
          {subtitle}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
