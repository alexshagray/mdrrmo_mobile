import React from 'react';
import { View, TextInput } from 'react-native';
import { Search } from 'lucide-react-native';

export function SearchBar({ placeholder = 'Search...', value, onChangeText, className = '' }) {
  return (
    <View className={`flex-row items-center bg-slate-100 rounded-full px-4 py-2 ${className}`}>
      <Search size={20} color="#64748B" />
      <TextInput
        className="flex-1 ml-2 text-base text-slate-800 h-10"
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}
