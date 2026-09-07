import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '@/shared/components';
import { Mail, ArrowLeft } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-50 p-6" edges={['top', 'bottom']}>
      <View className="flex-row items-center mb-8 mt-2">
        <Button variant="ghost" title={<ArrowLeft size={24} color="#1E293B" />} className="p-2 -ml-2 mr-2" onPress={() => router.back()} />
        <Text className="text-2xl font-bold text-slate-900">Reset Password</Text>
      </View>

      <View className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <Text className="text-slate-600 mb-6 leading-relaxed">
          Enter your registered email address and we'll send you instructions to reset your password.
        </Text>

        <View className="flex-row items-center bg-slate-50 rounded-xl px-4 py-3 mb-6 border border-slate-200">
          <Mail size={20} color="#64748B" />
          <TextInput
            className="flex-1 ml-3 text-base text-slate-900 h-8"
            placeholder="Email address"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <Button 
          title="SEND INSTRUCTIONS" 
          variant="primary" 
          size="lg" 
          onPress={() => {
            // UI Only
            router.back();
          }} 
          className="w-full shadow-md shadow-blue-200"
        />
      </View>
    </SafeAreaView>
  );
}
