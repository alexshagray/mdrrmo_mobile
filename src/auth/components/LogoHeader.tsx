import React from 'react';
import { View, Text } from 'react-native';
import { ShieldPlus } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface LogoHeaderProps {
  appName: string;
  subtitle: string;
  children?: React.ReactNode;
}

export function LogoHeader({ appName, subtitle, children }: LogoHeaderProps) {
  return (
    <Animated.View 
      entering={FadeInDown.delay(100).duration(600).springify()} 
      className="items-center mb-10 mt-8"
    >
      <View className="bg-white/20 p-4 rounded-2xl mb-5 border border-white/30 shadow-sm">
        <ShieldPlus size={48} color="#FFFFFF" strokeWidth={1.5} />
      </View>
      
      {children}
      
      <Text className="text-3xl font-extrabold text-white mb-2 text-center tracking-tight">
        {appName}
      </Text>
      <Text className="text-blue-100 text-center font-medium text-base">
        {subtitle}
      </Text>
    </Animated.View>
  );
}
