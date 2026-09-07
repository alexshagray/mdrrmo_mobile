import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { WifiOff } from 'lucide-react-native';

export function OfflineBanner() {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <Animated.View 
      style={{ transform: [{ translateY }], opacity }}
      className="bg-red-500 py-3 px-4 flex-row items-center justify-center w-full z-50 absolute top-0 pt-12"
    >
      <WifiOff size={16} color="#FFFFFF" className="mr-2" />
      <Text className="text-white font-medium text-sm ml-2">
        No internet connection. Operating offline.
      </Text>
    </Animated.View>
  );
}
