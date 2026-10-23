import React from 'react';
import { View, Text, Image } from 'react-native';
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
      className="items-center mb-8 mt-6"
    >
      <View className="w-24 h-24 bg-white/10 rounded-3xl items-center justify-center mb-4 border border-white/20 shadow-md">
        <Image
          source={require('../../../../assets/images/opol-resq-logo.png')}
          style={{ width: 72, height: 72 }}
          resizeMode="contain"
        />
      </View>
      
      {children}
      
      <Text className="text-3xl font-black text-white mb-1.5 text-center tracking-tight">
        {appName}
      </Text>
      <Text className="text-blue-100 text-center font-medium text-sm px-6">
        {subtitle}
      </Text>
    </Animated.View>
  );
}
