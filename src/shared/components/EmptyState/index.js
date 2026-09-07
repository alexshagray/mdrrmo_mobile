import React from 'react';
import { View, Text } from 'react-native';
import { FileQuestion } from 'lucide-react-native';

export function EmptyState({ title = 'No Data Available', message, icon = null, className = '' }) {
  return (
    <View className={`items-center justify-center p-8 flex-1 ${className}`}>
      <View className="bg-slate-50 w-20 h-20 rounded-full items-center justify-center mb-4">
        {icon ? icon : <FileQuestion size={32} color="#94A3B8" />}
      </View>
      <Text className="text-lg font-bold text-slate-800 mb-2">{title}</Text>
      {message && <Text className="text-sm text-slate-500 text-center">{message}</Text>}
    </View>
  );
}
