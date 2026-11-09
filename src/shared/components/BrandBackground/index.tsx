import React from 'react';
import { View } from 'react-native';

export interface BrandBackgroundProps {
  /**
   * - 'home': standard 52% height with rounded bottom curve for home / dashboard screens
   * - 'profile': taller 60% height with deeper rounded curve (60px)
   * - 'subpage': compact 190px header curve for sub-screens / settings
   * - 'tall': 60% height with 60px curve (matches auth screens & PCR empty state)
   */
  variant?: 'home' | 'profile' | 'subpage' | 'tall';
}

export function BrandBackground({ variant = 'home' }: BrandBackgroundProps) {
  let heightClass = 'h-[52%] rounded-b-[28px]';
  if (variant === 'profile' || variant === 'tall') {
    heightClass = 'h-[60%] rounded-b-[60px]';
  } else if (variant === 'subpage') {
    heightClass = 'h-[190px] rounded-b-[36px]';
  }

  return (
    <View
      className={`absolute top-0 left-0 right-0 ${heightClass} bg-[#208AEF] overflow-hidden`}
      pointerEvents="none"
    >
      {/* Decorative overlapping brand circles matching login and responder screens */}
      <View className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-[#3B9CF8] rounded-full opacity-40" />
      <View className="absolute top-[20%] right-[-80px] w-80 h-80 bg-[#1570C7] rounded-full opacity-40" />
      <View className="absolute bottom-[-30px] left-[10%] w-40 h-40 bg-[#70B9FA] rounded-full opacity-30" />
    </View>
  );
}

