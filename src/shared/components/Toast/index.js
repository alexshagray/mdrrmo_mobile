import React, { useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import { CheckCircle, AlertCircle, Info } from 'lucide-react-native';

export function Toast({ visible, message, type = 'info', onHide, duration = 3000, className = '' }) {
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(duration),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true })
      ]).start(() => {
        if (onHide) onHide();
      });
    }
  }, [visible]);

  if (!visible) return null;

  let config = { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: <Info size={20} color="#1D4ED8" /> };
  if (type === 'success') {
    config = { bg: 'bg-green-50 border-green-200', text: 'text-green-800', icon: <CheckCircle size={20} color="#15803D" /> };
  } else if (type === 'error') {
    config = { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: <AlertCircle size={20} color="#B91C1C" /> };
  }

  return (
    <Animated.View 
      style={{ opacity }} 
      className={`absolute top-12 left-4 right-4 rounded-xl border p-4 shadow-sm flex-row items-center space-x-3 ${config.bg} ${className}`}
    >
      {config.icon}
      <Text className={`font-medium ml-2 flex-1 ${config.text}`}>{message}</Text>
    </Animated.View>
  );
}
