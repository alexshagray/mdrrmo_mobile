import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, KeyRound, ArrowLeft, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { AuthBackground, LoginCard } from '@/auth/components';
import { Input, Button } from '@/shared/components';
import { forgotPasswordApi } from '@/shared/api/auth';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (error) setError('');
  };

  const handleSendResetLink = async () => {
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) {
      setError('Please enter your email address');
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await forgotPasswordApi(trimmedEmail);
      setIsSubmitted(true);
      Toast.show({
        type: 'success',
        text1: 'Request Processed',
        text2: 'If the email is registered, a link has been sent.',
      });
    } catch (err: any) {
      const serverMessage =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.email?.[0] ||
        'Unable to send reset link. Please check your network and try again.';

      // If server returns validation error, display it
      if (err?.response?.status === 422 && err?.response?.data?.errors?.email) {
        setError(err.response.data.errors.email[0]);
      } else {
        // For general security, still transition or show safe message
        setIsSubmitted(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthBackground>
      {/* Back Button Header */}
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
        {isSubmitted ? (
          /* Confirmation State */
          <View className="py-2 items-center text-center">
            <View className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 items-center justify-center mb-5 shadow-sm">
              <CheckCircle2 size={36} color="#10B981" />
            </View>

            <Text className="text-2xl font-bold text-slate-900 text-center mb-2">
              Check Your Email
            </Text>

            <View className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 mb-5 w-full">
              <Text className="text-emerald-900 text-sm font-semibold text-center leading-relaxed">
                If the email address is registered, a password reset link has been sent.
              </Text>
            </View>

            <Text className="text-slate-500 text-sm text-center leading-relaxed mb-6 px-2">
              Please check your inbox (and spam folder) for an email with your time-limited reset link. The link will safely expire in <Text className="font-semibold text-slate-700">60 minutes</Text>.
            </Text>

            <Button
              title="Back to Login"
              variant="primary"
              size="lg"
              onPress={() => router.replace('/login')}
              className="w-full shadow-lg shadow-blue-500/20 mb-3"
            />

            <TouchableOpacity
              onPress={() => {
                setIsSubmitted(false);
                setEmail('');
              }}
              className="flex-row items-center justify-center py-2.5 px-4"
              activeOpacity={0.7}
            >
              <RefreshCw size={14} color="#64748B" />
              <Text className="text-slate-600 text-sm font-medium ml-1.5">
                Send another reset link
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Input Form State */
          <View className="py-1">
            <View className="items-center mb-6">
              <View className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 items-center justify-center mb-3.5 shadow-sm">
                <KeyRound size={28} color="#2563EB" />
              </View>
              <Text className="text-2xl font-bold text-slate-900 text-center tracking-tight">
                Forgot Password?
              </Text>
              <Text className="text-slate-500 text-sm text-center mt-1.5 px-2 leading-relaxed">
                Enter your registered email address to receive a secure password reset link.
              </Text>
            </View>

            <Input
              label="Registered Email Address"
              placeholder="e.g. resident@gmail.com"
              value={email}
              onChangeText={handleEmailChange}
              error={error}
              icon={<Mail size={20} />}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={handleSendResetLink}
            />

            <Button
              title={isLoading ? 'Sending Link...' : 'Send Reset Link'}
              variant="primary"
              size="lg"
              isLoading={isLoading}
              onPress={handleSendResetLink}
              className="w-full shadow-lg shadow-blue-500/25 mt-1 mb-5"
            />

            <View className="border-t border-slate-100 pt-4 items-center">
              <TouchableOpacity
                onPress={() => router.replace('/login')}
                className="flex-row items-center py-2 px-3"
                activeOpacity={0.7}
              >
                <ArrowLeft size={16} color="#64748B" />
                <Text className="text-slate-600 text-sm font-semibold ml-1.5">
                  Back to Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </LoginCard>
    </AuthBackground>
  );
}
