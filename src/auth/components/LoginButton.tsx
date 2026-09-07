import React from 'react';
import { TouchableOpacity, View, Text, ActivityIndicator } from 'react-native';
import { ArrowRight } from 'lucide-react-native';

interface LoginButtonProps {
  title?: string;
  onPress: () => void;
  isLoading?: boolean;
}

export function LoginButton({ title = "Sign In", onPress, isLoading }: LoginButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.8}
      className={`w-full rounded-2xl overflow-hidden shadow-lg shadow-blue-500/30 ${isLoading ? 'opacity-80' : ''}`}
    >
      <View className="bg-blue-600 py-4 flex-row justify-center items-center">
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text className="text-white text-base font-bold mr-2 tracking-wide">{title}</Text>
            <ArrowRight size={18} color="#FFFFFF" />
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}
