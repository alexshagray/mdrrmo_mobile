import React from 'react';
import { View, Text } from 'react-native';

interface AuthFooterProps {
  appName: string;
}

export function AuthFooter({ appName }: AuthFooterProps) {
  return (
    <View className="items-center mt-auto pb-4">
      <Text className="text-slate-400 text-xs mb-1">{appName}</Text>
      <Text className="text-slate-400 text-xs">Version 1.0.0 © 2026</Text>
    </View>
  );
}
