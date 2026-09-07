import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  error,
  icon,
  containerStyle,
  secureTextEntry,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const isPassword = secureTextEntry !== undefined;
  const isSecure = isPassword && !showPassword;

  // Clone icon to apply active color if focused
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return React.cloneElement(icon as React.ReactElement, {
        color: error ? '#EF4444' : isFocused ? '#3B82F6' : '#94A3B8',
        size: 20
      });
    }
    return icon;
  };

  return (
    <View className="mb-5" style={containerStyle}>
      {label && (
        <Text className="text-slate-700 text-sm font-medium mb-2 ml-1">
          {label}
        </Text>
      )}
      
      <View 
        className={`flex-row items-center bg-slate-50 rounded-2xl px-4 py-3 border transition-colors ${
          error ? 'border-red-500 bg-red-50/30' :
          isFocused ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200'
        }`}
      >
        {renderIcon()}
        
        <TextInput
          className={`flex-1 text-base text-slate-900 py-0 ${icon ? 'ml-3' : ''}`}
          placeholderTextColor="#94A3B8"
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={isSecure}
          {...rest}
        />

        {isPassword && (
          <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)} 
            className="p-1 ml-2"
            activeOpacity={0.7}
          >
            {showPassword ? (
              <EyeOff size={20} color="#94A3B8" />
            ) : (
              <Eye size={20} color="#94A3B8" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text className="text-red-500 text-xs mt-1 ml-1">{error}</Text>
      )}
    </View>
  );
}
