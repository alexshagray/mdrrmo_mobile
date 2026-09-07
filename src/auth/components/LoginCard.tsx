import React from 'react';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface LoginCardProps {
  children: React.ReactNode;
}

export function LoginCard({ children }: LoginCardProps) {
  return (
    <Animated.View 
      entering={FadeInUp.delay(300).duration(600).springify()} 
      className="bg-white/95 rounded-3xl shadow-xl shadow-blue-900/10 border border-white/60 p-6 md:p-8 mb-8 backdrop-blur-md"
    >
      {children}
    </Animated.View>
  );
}
