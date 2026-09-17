import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ColorValue } from 'react-native';

interface AnimatedTabIconProps {
  focused: boolean;
  color: ColorValue;
  IconComponent: React.ComponentType<any>;
}

export function AnimatedTabIcon({ focused, color, IconComponent }: AnimatedTabIconProps) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1.15 : 1)).current;
  const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.15 : 1,
        useNativeDriver: true,
        speed: 16,
        bounciness: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: focused ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  }, [focused, scaleAnim, opacityAnim]);

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.background, 
          { 
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]} 
      />
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <IconComponent 
          color={color} 
          size={24} 
          strokeWidth={2.25} // New global stroke width standard
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 48,
    height: 48,
  },
  background: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: 'rgba(99, 102, 241, 0.1)', // bg-resident-primary/10 equivalent
    borderRadius: 14,
  }
});
