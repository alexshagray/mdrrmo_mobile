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
    <View className={`flex-row items-center justify-between pt-4 pb-3 px-5 ${className}`}>
      <View className="flex-row items-center flex-1 pr-2">
        {showBack && (
          <TouchableOpacity 
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} 
            activeOpacity={0.7}
            className="w-10 h-10 bg-white items-center justify-center rounded-full mr-3.5 border border-slate-200/80 shadow-sm"
          >
            <ChevronLeft size={20} color="#334155" strokeWidth={2.5} />
          </TouchableOpacity>
        )}
        <View className="flex-1">
          {subtitle && (
            <Text className="text-slate-400 font-bold uppercase tracking-wider text-[11px] mb-0.5">
              {subtitle}
            </Text>
          )}
          <Text 
            className="text-2xl font-black tracking-tight text-slate-900 leading-tight" 
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
