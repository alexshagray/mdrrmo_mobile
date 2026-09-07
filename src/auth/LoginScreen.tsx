import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useNetworkStatus } from '@/shared/hooks';
import Toast from 'react-native-toast-message';
import { LoginScreenConfig } from './types/auth';
import {
  AuthBackground,
  LogoHeader,
  RoleBadge,
  WelcomeSection,
  LoginCard,
  LoginForm,
  RememberMe,
  ForgotPasswordLink,
  LoginButton,
  AuthFooter
} from './components';

interface LoginScreenProps {
  config: LoginScreenConfig;
}

export function LoginScreen({ config }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  const { login } = useAuth();
  const { isOffline } = useNetworkStatus();
  const router = useRouter();

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
  };

  const handleLogin = async () => {
    const newErrors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fix the errors to continue.'
      });
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password, rememberMe);
    setIsSubmitting(false);

    if (!result.success) {
      if (result.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
        const formattedErrors: Record<string, string> = {};
        for (const [key, value] of Object.entries(result.fieldErrors)) {
          formattedErrors[key] = Array.isArray(value) ? value[0] : (value as string);
        }
        setErrors(formattedErrors);
      } else if (result.error?.toLowerCase().includes('email') || result.error?.toLowerCase().includes('credentials') || result.error?.toLowerCase().includes('match')) {
         setErrors({ email: result.error || 'These credentials do not match our records.' });
      } else {
         setErrors({ email: result.error || 'Login failed' });
      }
      
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: result.error || 'Please check your inputs.'
      });
    }
  };

  return (
    <AuthBackground>
      {/* Header Section */}
      <LogoHeader appName={config.appName} subtitle={config.subtitle}>
        {config.badgeText && <RoleBadge text={config.badgeText} />}
      </LogoHeader>

      {/* Login Card */}
      <LoginCard>
        <WelcomeSection 
          title={config.welcomeTitle}
          subtitle={config.welcomeSubtitle}
        />

        <LoginForm 
          emailValue={email}
          onEmailChange={handleEmailChange}
          passwordValue={password}
          onPasswordChange={handlePasswordChange}
          errors={errors}
        />

        {/* Options Row */}
        <View className="flex-row justify-between items-center mb-8">
          <RememberMe value={rememberMe} onValueChange={setRememberMe} />
          <ForgotPasswordLink onPress={() => router.push('/forgot-password')} />
        </View>

        {/* Login Button */}
        <LoginButton isLoading={isSubmitting || isOffline} onPress={handleLogin} />

        
        {/* Demo Credentials (Optional/Debug) */}
        {config.demoEmail && (
          <View className="items-center mt-6 flex-row justify-center bg-slate-50 py-2 px-3 rounded-lg border border-slate-100">
            <Text className="text-slate-400 text-xs mr-1">Demo:</Text>
            <Text className="text-xs text-slate-500 font-medium">{config.demoEmail}</Text>
          </View>
        )}

        {/* Registration Link */}
        {config.allowRegistration && (
          <View className="mt-8 flex-row justify-center items-center">
            <Text className="text-slate-500">Don't have an account? </Text>
            <Text 
              className="text-blue-600 font-bold" 
              onPress={() => router.push('/register')}
            >
              Sign Up
            </Text>
          </View>
        )}
      </LoginCard>

      {/* Footer Section */}
      <AuthFooter appName={config.appName} />
    </AuthBackground>
  );
}
