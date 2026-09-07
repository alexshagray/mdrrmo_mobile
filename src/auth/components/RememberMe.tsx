import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Check } from 'lucide-react-native';

interface RememberMeProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function RememberMe({ value, onValueChange }: RememberMeProps) {
  return (
    <TouchableOpacity 
      className="flex-row items-center" 
      onPress={() => onValueChange(!value)}
      activeOpacity={0.7}
    >
      <View 
        className={`w-5 h-5 rounded border flex items-center justify-center mr-2 ${
          value ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-slate-50'
        }`}
      >
        {value && <Check size={14} color="#FFF" />}
      </View>
      <Text className="text-slate-600 text-sm font-medium">Remember me</Text>
    </TouchableOpacity>
  );
}
