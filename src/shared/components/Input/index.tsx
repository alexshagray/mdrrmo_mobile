import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Eye, EyeOff, AlertCircle } from 'lucide-react-native';

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
      return React.cloneElement(icon as React.ReactElement<any>, {
        color: error ? '#EF4444' : isFocused ? '#208AEF' : '#94A3B8',
        size: 20
      });
    }
    return icon;
  };

  return (
    <View className="mb-5" style={containerStyle}>
      {label && (
        <Text className="text-slate-800 text-sm font-semibold mb-2 ml-1">
          {label}
        </Text>
      )}
      
      <View 
        className={`flex-row items-center bg-white rounded-2xl px-4 py-3.5 ${
          error ? 'border-2 border-red-500 bg-red-50/30' :
          isFocused ? 'border-2 border-[#208AEF] bg-blue-50/20' : 'border border-slate-200/90'
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
        <View className="flex-row items-center mt-1.5 ml-1">
          <AlertCircle size={13} color="#EF4444" style={{ marginRight: 4 }} />
          <Text className="text-red-600 font-semibold text-xs flex-1">{error}</Text>
        </View>
      )}
    </View>
  );
}
