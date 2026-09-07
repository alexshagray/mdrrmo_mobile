import React from 'react';
import { View, Text } from 'react-native';

interface RoleBadgeProps {
  text: string;
}

export function RoleBadge({ text }: RoleBadgeProps) {
  if (!text) return null;
  
  return (
    <View className="bg-indigo-500/50 px-3 py-1 rounded-full mb-3 border border-indigo-400/50">
      <Text className="text-indigo-50 text-xs font-semibold tracking-wider uppercase">
        {text}
      </Text>
    </View>
  );
}
