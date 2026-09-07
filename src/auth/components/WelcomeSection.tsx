import React from 'react';
import { View, Text } from 'react-native';

interface WelcomeSectionProps {
  title?: string;
  subtitle?: string;
}

export function WelcomeSection({ title = "Welcome Back", subtitle }: WelcomeSectionProps) {
  return (
    <View className="mb-8">
      <Text className="text-2xl font-bold text-slate-800 mb-2">{title}</Text>
      {subtitle && (
        <Text className="text-slate-500 text-sm">{subtitle}</Text>
      )}
    </View>
  );
}
