import React from 'react';
import { View, Text } from 'react-native';

export function Badge({ text, variant = 'info', className = '' }) {
  const variants = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    default: 'bg-slate-100 text-slate-800',
  };

  return (
    <View className={`rounded-full px-2 py-0.5 ${variants[variant].split(' ')[0]} ${className}`}>
      <Text className={`text-xs font-medium ${variants[variant].split(' ')[1]}`}>{text}</Text>
    </View>
  );
}
