import React from 'react';
import { View } from 'react-native';
import { RingPulse } from '../RingPulse';

export function Loading({
  message = 'Loading...',
  fullScreen = false,
  className = '',
  size = 56,
  color = '#208AEF',
  strokeWidth = 4,
  trackColor = 'rgba(148, 163, 184, 0.28)',
}) {
  const containerClass = fullScreen
    ? 'flex-1 absolute inset-0 bg-white/90 z-50 items-center justify-center'
    : `items-center justify-center p-8 flex-1 ${className}`;

  return (
    <View className={containerClass}>
      <RingPulse
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        trackColor={trackColor}
        message={message}
      />
    </View>
  );
}

export default Loading;
