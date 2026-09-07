import React from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AuthBackgroundProps {
  children: React.ReactNode;
}

export function AuthBackground({ children }: AuthBackgroundProps) {
  return (
    <View className="flex-1 bg-slate-50">
      {/* Background Elements */}
      <View className="absolute top-0 left-0 right-0 h-[60%] bg-blue-600 rounded-b-[60px] overflow-hidden">
        <View className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-blue-500 rounded-full opacity-50" />
        <View className="absolute top-[20%] right-[-80px] w-80 h-80 bg-blue-700 rounded-full opacity-40" />
        <View className="absolute bottom-[-30px] left-[10%] w-40 h-40 bg-blue-400 rounded-full opacity-30" />
      </View>

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
