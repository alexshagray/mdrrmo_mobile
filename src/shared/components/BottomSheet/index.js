import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';

export function BottomSheet({ visible, onClose, title, children, className = '' }) {
  if (!visible) return null;

  return (
    <View className="absolute inset-0 bg-black/40 justify-end z-50">
      <View className={`bg-white rounded-t-3xl pt-2 px-4 pb-8 max-h-[80%] ${className}`}>
        {/* Handle */}
        <View className="items-center mb-4">
          <View className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </View>
        
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xl font-bold text-slate-800">{title}</Text>
          <TouchableOpacity onPress={onClose} className="p-1">
            <X size={24} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}
