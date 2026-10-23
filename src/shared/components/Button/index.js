import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

export function Button({ 
  onPress, 
  title, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  icon = null,
  iconRight = null,
  className = '', 
  ...props 
}) {
  const baseStyle = 'items-center justify-center rounded-2xl flex-row active:opacity-85';
  
  const variants = {
    primary: 'bg-[#208AEF] shadow-sm shadow-blue-500/25',
    secondary: 'bg-[#1E293B] shadow-sm shadow-slate-900/10',
    emergency: 'bg-[#FF3B30] shadow-sm shadow-red-500/25',
    danger: 'bg-[#FF3B30] shadow-sm shadow-red-500/25',
    outline: 'border border-[#208AEF] bg-blue-50/10',
    outlineEmergency: 'border border-[#FF3B30] bg-red-50/10',
    ghost: 'bg-transparent',
    surface: 'bg-white border border-slate-200 shadow-sm',
  };

  const sizes = {
    sm: 'py-2 px-3.5',
    md: 'py-3.5 px-5',
    lg: 'py-4 px-6',
  };

  const textVariants = {
    primary: 'text-white',
    secondary: 'text-white',
    emergency: 'text-white',
    danger: 'text-white',
    outline: 'text-[#208AEF]',
    outlineEmergency: 'text-[#FF3B30]',
    ghost: 'text-[#208AEF]',
    surface: 'text-slate-800',
  };

  const textSizes = {
    sm: 'text-xs font-semibold',
    md: 'text-sm font-bold',
    lg: 'text-base font-bold',
  };

  const currentVariant = variants[variant] || variants.primary;
  const currentTextVariant = textVariants[variant] || textVariants.primary;
  const currentSize = sizes[size] || sizes.md;
  const currentTextSize = textSizes[size] || textSizes.md;

  const spinnerColor = 
    variant === 'outline' || variant === 'ghost' ? '#208AEF' : 
    variant === 'outlineEmergency' ? '#FF3B30' : 
    variant === 'surface' ? '#1E293B' : '#FFFFFF';

  return (
    <TouchableOpacity
      className={`${baseStyle} ${currentVariant} ${currentSize} ${props.disabled || isLoading ? 'opacity-55' : ''} ${className}`}
      onPress={onPress}
      disabled={isLoading || props.disabled}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={spinnerColor} size="small" />
      ) : (
        <>
          {icon && <View className="mr-2">{icon}</View>}
          {title && <Text className={`${currentTextVariant} ${currentTextSize} tracking-wide`}>{title}</Text>}
          {iconRight && <View className="ml-2">{iconRight}</View>}
        </>
      )}
    </TouchableOpacity>
  );
}

