import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Lock, ArrowLeft, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { AuthBackground, LoginCard } from '@/auth/components';
import { Input, Button } from '@/shared/components';
import { resetPasswordApi } from '@/shared/api/auth';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; email?: string }>();

  const token = params.token || '';
  const email = params.email || '';

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [errors, setErrors] = useState<{ password?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isMinLength = password.length >= 8;
  const isMatching = password.length > 0 && password === passwordConfirmation;

  const handleResetPassword = async () => {
    const newErrors: { password?: string; general?: string } = {};

    if (!token) {
      newErrors.general = 'Missing or invalid reset token. Please request a new link.';
    }

    if (!email) {
      newErrors.general = 'Missing email address. Please request a new link.';
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
      await resetPasswordApi({
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });

      setIsSuccess(true);
      Toast.show({
        type: 'success',
        text1: 'Password Reset',
        text2: 'Your password has been reset successfully.',
      });
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.password?.[0] ||
        err?.response?.data?.errors?.email?.[0] ||
        'Unable to reset password. The link may be expired or invalid.';

      setErrors({ general: serverMsg });
      Toast.show({
        type: 'error',
        text1: 'Reset Failed',
        text2: serverMsg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthBackground>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6">
        <TouchableOpacity
          onPress={() => router.replace('/login')}
          className="w-10 h-10 rounded-2xl bg-white/20 items-center justify-center border border-white/30 backdrop-blur-md"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20">
          <ShieldCheck size={14} color="#93C5FD" />
          <Text className="text-white/90 text-xs font-semibold uppercase tracking-wider">
            MDRRMO Security
          </Text>
        </View>
      </View>

      <LoginCard>
        {isSuccess ? (
          /* Confirmation State */
          <View className="py-2 items-center text-center">
            <View className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 items-center justify-center mb-5 shadow-sm">
              <CheckCircle2 size={36} color="#10B981" />
            </View>

            <Text className="text-2xl font-bold text-slate-900 text-center mb-2">
              Password Changed!
            </Text>

            <View className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 mb-5 w-full">
              <Text className="text-emerald-900 text-sm font-semibold text-center leading-relaxed">
                Your password has been reset successfully.
              </Text>
            </View>

            <Text className="text-slate-500 text-sm text-center leading-relaxed mb-6 px-2">
              You can now use your new password to sign in to your MDRRMO account.
            </Text>

            <Button
              title="Back to Login"
              variant="primary"
              size="lg"
              onPress={() => router.replace('/login')}
              className="w-full shadow-lg shadow-blue-500/20"
            />
          </View>
        ) : (
          /* Reset Form State */
          <View className="py-1">
            <View className="items-center mb-6">
              <View className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 items-center justify-center mb-3.5 shadow-sm">
                <Lock size={28} color="#2563EB" />
              </View>
              <Text className="text-2xl font-bold text-slate-900 text-center tracking-tight">
                Reset Password
              </Text>
              <Text className="text-slate-500 text-sm text-center mt-1.5 px-2 leading-relaxed">
                Create a strong new password for your MDRRMO account.
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
              returnKeyType="next"
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
              onSubmitEditing={handleResetPassword}
            />

            {/* Checklist */}
            <View className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 mb-5 space-y-2">
              <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Password Requirements
              </Text>
              <View className="flex-row items-center">
                <View
                  className={`w-4 h-4 rounded-full items-center justify-center mr-2 ${
                    isMinLength ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                >
                  <Text className="text-white text-[10px] font-bold">✓</Text>
                </View>
                <Text className={`text-xs ${isMinLength ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                  At least 8 characters
                </Text>
              </View>
              <View className="flex-row items-center">
                <View
                  className={`w-4 h-4 rounded-full items-center justify-center mr-2 ${
                    isMatching ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                >
                  <Text className="text-white text-[10px] font-bold">✓</Text>
                </View>
                <Text className={`text-xs ${isMatching ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                  Passwords match
                </Text>
              </View>
            </View>

            <Button
              title={isLoading ? 'Resetting Password...' : 'Reset Password'}
              variant="primary"
              size="lg"
              isLoading={isLoading}
              disabled={!isMinLength || !isMatching}
              onPress={handleResetPassword}
              className="w-full shadow-lg shadow-blue-500/25 mb-4"
            />

            <View className="border-t border-slate-100 pt-4 items-center">
              <TouchableOpacity
                onPress={() => router.replace('/login')}
                className="flex-row items-center py-2 px-3"
                activeOpacity={0.7}
              >
                <ArrowLeft size={16} color="#64748B" />
                <Text className="text-slate-600 text-sm font-semibold ml-1.5">
                  Back to Login
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </LoginCard>
    </AuthBackground>
  );
}
