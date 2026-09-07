import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
  className?: string;
}

export function Header({ 
  title, 
  subtitle, 
  showBack = false, 
  rightElement = null, 
  className = '' 
}: HeaderProps) {
  const router = useRouter();

  return (
    <View className={`flex-row items-center justify-between py-6 px-5 bg-white ${className}`}>
      <View className="flex-row items-center flex-1 pr-2">
        {showBack && (
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="bg-slate-50 p-3 rounded-2xl mr-4 border border-slate-200/60 shadow-sm"
          >
            <ChevronLeft size={22} color="#1E293B" strokeWidth={3} />
          </TouchableOpacity>
        )}
        <View className="flex-1">
          {subtitle && (
            <Text className="text-blue-600 font-black uppercase tracking-[0.2em] text-[10px] mb-1.5 opacity-90">
              {subtitle}
            </Text>
          )}
          <Text 
            className="text-3xl font-black tracking-tighter text-slate-800 leading-tight" 
            numberOfLines={2}
          >
            {title}
          </Text>
        </View>
      </View>
      {rightElement && <View>{rightElement}</View>}
    </View>
  );
}
