import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

export function Loading({ message = 'Loading...', fullScreen = false, className = '' }) {
  const containerClass = fullScreen ? 'flex-1 absolute inset-0 bg-white/80 z-50 items-center justify-center' : `items-center justify-center p-8 flex-1 ${className}`;

  return (
    <View className={containerClass}>
      <ActivityIndicator size="large" color="#208AEF" />
      {message && <Text className="mt-4 text-slate-500 font-medium">{message}</Text>}
    </View>
  );
}
