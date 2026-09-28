import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, AlertCircle, ShieldCheck } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { AuthBackground, LoginCard } from '@/auth/components';
import { Input, Button } from '@/shared/components';
import apiClient from '@/shared/api/client';
import { useAuth } from '@/shared/hooks';

export default function ForceChangePasswordScreen() {
  const router = useRouter();
  const { logout, refreshUser } = useAuth();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [errors, setErrors] = useState<{ current_password?: string; password?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const isMinLength = password.length >= 8;
  const isMatching = password.length > 0 && password === passwordConfirmation;

  const handleChangePassword = async () => {
    const newErrors: { current_password?: string; password?: string; general?: string } = {};

    if (!currentPassword) {
      newErrors.current_password = 'Current password is required';
    }
    if (!password) {
      newErrors.password = 'New password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (password !== passwordConfirmation) {
      newErrors.password = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await apiClient.put('/api/responder/profile/password', {
        current_password: currentPassword,
        password: password,
        password_confirmation: passwordConfirmation,
      });

      Toast.show({
        type: 'success',
        text1: 'Password Updated',
        text2: 'Your password has been successfully changed.',
      });
      
      await refreshUser(); // This will refresh the user and `password_change_required` should become false
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.password?.[0] ||
        err?.response?.data?.errors?.current_password?.[0] ||
        'Unable to change password. Please check your current password.';

      setErrors({ general: serverMsg });
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: serverMsg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthBackground>
      <View className="flex-row items-center justify-end mb-6">
        <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20">
          <ShieldCheck size={14} color="#93C5FD" />
          <Text className="text-white/90 text-xs font-semibold uppercase tracking-wider">
            Action Required
          </Text>
        </View>
      </View>

      <LoginCard>
        <View className="py-1">
          <View className="items-center mb-6">
            <View className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 items-center justify-center mb-3.5 shadow-sm">
              <Lock size={28} color="#F59E0B" />
            </View>
            <Text className="text-2xl font-bold text-slate-900 text-center tracking-tight">
              Change Default Password
            </Text>
            <Text className="text-slate-500 text-sm text-center mt-1.5 px-2 leading-relaxed">
              For security reasons, you must change your temporary password before continuing.
            </Text>
          </View>

          {errors.general && (
            <View className="flex-row items-center bg-red-50 border border-red-200 rounded-2xl p-3 mb-4">
              <AlertCircle size={18} color="#EF4444" />
              <Text className="text-red-700 text-xs font-medium ml-2 flex-1">
                {errors.general}
              </Text>
            </View>
          )}

          <Input
            label="Current Password"
            placeholder="Enter temporary password"
            value={currentPassword}
            onChangeText={(val) => {
              setCurrentPassword(val);
              if (errors.current_password) setErrors((prev) => ({ ...prev, current_password: undefined }));
            }}
            error={errors.current_password}
            secureTextEntry
            icon={<Lock size={20} />}
            autoCapitalize="none"
          />

          <Input
            label="New Password"
            placeholder="Minimum 8 characters"
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={errors.password}
            secureTextEntry
            icon={<Lock size={20} />}
            autoCapitalize="none"
          />

          <Input
            label="Confirm New Password"
            placeholder="Repeat your new password"
            value={passwordConfirmation}
            onChangeText={(val) => {
              setPasswordConfirmation(val);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            secureTextEntry
            icon={<Lock size={20} />}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleChangePassword}
          />

          <Button
            title={isLoading ? 'Updating Password...' : 'Change Password'}
            variant="primary"
            size="lg"
            isLoading={isLoading}
            disabled={!isMinLength || !isMatching || !currentPassword}
            onPress={handleChangePassword}
            className="w-full shadow-lg shadow-blue-500/25 mb-4"
          />

          <View className="border-t border-slate-100 pt-4 items-center">
             <TouchableOpacity
                onPress={() => logout()}
                className="py-2 px-3"
             >
                <Text className="text-slate-500 text-sm font-semibold">
                  Sign out instead
                </Text>
             </TouchableOpacity>
          </View>
        </View>
      </LoginCard>
    </AuthBackground>
  );
}
