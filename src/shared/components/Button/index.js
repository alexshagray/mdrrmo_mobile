import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

export function Button({ onPress, title, variant = 'primary', size = 'md', isLoading = false, className = '', ...props }) {
  const baseStyle = 'items-center justify-center rounded-xl flex-row';
  
  const variants = {
    primary: 'bg-[#208AEF]',
    secondary: 'bg-[#64748B]',
    danger: 'bg-[#EF4444]',
    outline: 'border-2 border-[#208AEF] bg-transparent',
    ghost: 'bg-transparent',
  };

  const sizes = {
    sm: 'py-2 px-4',
    md: 'py-3 px-6',
    lg: 'py-4 px-8',
  };

  const textVariants = {
    primary: 'text-white',
    secondary: 'text-white',
    danger: 'text-white',
    outline: 'text-[#208AEF]',
    ghost: 'text-[#208AEF]',
  };

  const textSizes = {
    sm: 'text-sm font-medium',
    md: 'text-base font-semibold',
    lg: 'text-lg font-bold',
  };

  return (
    <TouchableOpacity
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      onPress={onPress}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? '#208AEF' : '#FFF'} />
      ) : (
        <Text className={`${textVariants[variant]} ${textSizes[size]}`}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
