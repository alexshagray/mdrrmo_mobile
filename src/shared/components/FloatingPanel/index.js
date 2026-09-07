import React from 'react';
import { View } from 'react-native';

export function FloatingPanel({ children, className = '' }) {
  return (
    <View className={`absolute bottom-6 left-4 right-4 bg-white/90 rounded-3xl p-5 shadow-lg border border-slate-200/50 ${className}`} style={{ backdropFilter: 'blur(10px)' }}>
      {children}
    </View>
  );
}
