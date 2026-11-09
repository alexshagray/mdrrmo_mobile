import React from 'react';
import { View, Text, Image, ImageSourcePropType } from 'react-native';

export interface AvatarProps {
  source?: ImageSourcePropType | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ source = null, name, size = 'md', className = '' }: AvatarProps) {
  const sizes: Record<string, string> = {
    sm: 'w-8 h-8 rounded-full',
    md: 'w-12 h-12 rounded-full',
    lg: 'w-16 h-16 rounded-full',
    xl: 'w-24 h-24 rounded-full',
  };

  const textSizes: Record<string, string> = {
    sm: 'text-xs',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-3xl',
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <View className={`bg-slate-200 items-center justify-center overflow-hidden ${sizes[size] || sizes.md} ${className}`}>
      {source ? (
        <Image source={source} className={`${sizes[size] || sizes.md}`} />
      ) : (
        <Text className={`font-bold text-slate-600 ${textSizes[size] || textSizes.md}`}>{getInitials(name)}</Text>
      )}
    </View>
  );
}
