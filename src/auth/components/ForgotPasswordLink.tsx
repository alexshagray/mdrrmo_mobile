import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

interface ForgotPasswordLinkProps {
  onPress: () => void;
}

export function ForgotPasswordLink({ onPress }: ForgotPasswordLinkProps) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text className="text-[#208AEF] text-sm font-bold">Forgot Password?</Text>
    </TouchableOpacity>
  );
}
