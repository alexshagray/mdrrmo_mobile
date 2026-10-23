import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'emergency' | 'primary' | 'outlined' | 'subtle';
  className?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  [key: string]: any;
}

export function Card({ 
  children, 
  variant = 'default', 
  className = '', 
  onPress, 
  style,
  ...props 
}: CardProps) {
  const variantStyles = {
    default: 'bg-white border border-slate-100/90',
    emergency: 'bg-white border-l-4 border-l-[#FF3B30] border-y border-r border-slate-100/90',
    primary: 'bg-white border-l-4 border-l-[#208AEF] border-y border-r border-slate-100/90',
    outlined: 'bg-white border border-slate-200',
    subtle: 'bg-slate-50/80 border border-slate-100',
  };

  const selectedVariant = variantStyles[variant] || variantStyles.default;
  const baseClasses = `rounded-2xl p-4 shadow-sm ${selectedVariant} ${className}`;

  if (onPress) {
    return (
      <TouchableOpacity 
        onPress={onPress} 
        activeOpacity={0.75} 
        className={baseClasses} 
        style={[styles.elevation, style]}
        {...props}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View 
      className={baseClasses} 
      style={[styles.elevation, style]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  elevation: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
});
