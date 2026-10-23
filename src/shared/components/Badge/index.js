import React from 'react';
import { View, Text } from 'react-native';

export function Badge({ text, variant = 'info', className = '' }) {
  const variants = {
    success: 'bg-emerald-50 border border-emerald-200/80 text-emerald-700',
    warning: 'bg-amber-50 border border-amber-200/80 text-amber-700',
    error: 'bg-rose-50 border border-rose-200/80 text-rose-700',
    emergency: 'bg-red-50 border border-red-200/80 text-[#FF3B30]',
    info: 'bg-blue-50 border border-blue-200/80 text-[#208AEF]',
    primary: 'bg-blue-50 border border-blue-200/80 text-[#208AEF]',
    default: 'bg-slate-100 border border-slate-200 text-slate-700',
  };

  const selected = variants[variant] || variants.default;
  const [bgAndBorder, textColor] = [
    selected.substring(0, selected.lastIndexOf(' ')),
    selected.substring(selected.lastIndexOf(' ') + 1)
  ];

  return (
    <View className={`rounded-full px-2.5 py-0.5 ${bgAndBorder} ${className}`}>
      <Text className={`text-[11px] font-bold tracking-wider ${textColor}`}>{text}</Text>
    </View>
  );
}

