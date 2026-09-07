import React from 'react';
import { View, Text, Image } from 'react-native';

export function Avatar({ source = null, name, size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-8 h-8 rounded-full',
    md: 'w-12 h-12 rounded-full',
    lg: 'w-16 h-16 rounded-full',
    xl: 'w-24 h-24 rounded-full',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-3xl',
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <View className={`bg-slate-200 items-center justify-center ${sizes[size]} ${className}`}>
      {source ? (
        <Image source={source} className={`${sizes[size]}`} />
      ) : (
        <Text className={`font-bold text-slate-600 ${textSizes[size]}`}>{getInitials(name)}</Text>
      )}
    </View>
  );
}
