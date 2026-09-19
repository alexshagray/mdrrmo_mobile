import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

interface AnimatedTabIconProps {
  focused: boolean;
  IconComponent: React.ComponentType<any>;
}

export function AnimatedTabIcon({ focused, IconComponent }: AnimatedTabIconProps) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1.12 : 1)).current;
  const dotOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.12 : 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }),
      Animated.timing(dotOpacity, {
        toValue: focused ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused, scaleAnim, dotOpacity]);

  return (
    <View className="items-center justify-center py-1">
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <IconComponent
          color={focused ? '#0F172A' : '#94A3B8'}
          size={23}
          strokeWidth={focused ? 2.5 : 2}
        />
      </Animated.View>
      {/* Subtle active indicator dot below icon instead of heavy circle */}
      <Animated.View
        style={{ opacity: dotOpacity }}
        className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-1"
      />
    </View>
  );
}
