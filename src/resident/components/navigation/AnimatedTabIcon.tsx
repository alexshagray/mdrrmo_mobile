import React, { useEffect, useRef } from 'react';
import { Animated, View, Text } from 'react-native';

interface AnimatedTabIconProps {
  focused: boolean;
  IconComponent: React.ComponentType<any>;
  label?: string;
}

export function AnimatedTabIcon({ focused, IconComponent, label }: AnimatedTabIconProps) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1.06 : 1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.06 : 1,
      useNativeDriver: true,
      speed: 24,
      bounciness: 4,
    }).start();
  }, [focused, scaleAnim]);

  return (
    <View className="items-center justify-center min-w-[50px]">
      <Animated.View
        style={{ transform: [{ scale: scaleAnim }] }}
        className={`w-9 h-7 items-center justify-center rounded-xl ${
          focused ? 'bg-blue-50/90' : 'bg-transparent'
        }`}
      >
        <IconComponent
          color={focused ? '#208AEF' : '#64748B'}
          size={19}
          strokeWidth={focused ? 2.5 : 2.0}
        />
      </Animated.View>

      {label ? (
        <Text
          className={`text-[10px] tracking-tight mt-0.5 leading-tight ${
            focused ? 'text-[#208AEF] font-black' : 'text-slate-500 font-bold'
          }`}
          numberOfLines={1}
        >
          {label}
        </Text>
      ) : (
        <View
          className={`w-1 h-1 rounded-full mt-0.5 ${
            focused ? 'bg-[#208AEF]' : 'bg-transparent'
          }`}
        />
      )}
    </View>
  );
}
