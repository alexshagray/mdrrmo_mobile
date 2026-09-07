import React from 'react';
import { View } from 'react-native';
import { Mail, Lock } from 'lucide-react-native';
import { Input } from '@/shared/components';

interface LoginFormProps {
  emailValue: string;
  onEmailChange: (value: string) => void;
  passwordValue: string;
  onPasswordChange: (value: string) => void;
  errors?: Record<string, string>;
}

export function LoginForm({
  emailValue,
  onEmailChange,
  passwordValue,
  onPasswordChange,
  errors = {}
}: LoginFormProps) {
  return (
    <View>
      <Input
        label="Email Address"
        placeholder="Enter your email"
        value={emailValue}
        onChangeText={(val) => {
          onEmailChange(val);
        }}
        autoCapitalize="none"
        keyboardType="email-address"
        icon={<Mail />}
        error={errors.email}
      />

      <Input
        label="Password"
        placeholder="Enter your password"
        value={passwordValue}
        onChangeText={(val) => {
          onPasswordChange(val);
        }}
        secureTextEntry
        icon={<Lock />}
        error={errors.password}
      />
    </View>
  );
}
