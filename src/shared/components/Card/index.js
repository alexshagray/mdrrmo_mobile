import React from 'react';
import { View } from 'react-native';

export function Card({ children, className = '', ...props }) {
  return (
    <View className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-4 ${className}`} {...props}>
      {children}
    </View>
  );
}
