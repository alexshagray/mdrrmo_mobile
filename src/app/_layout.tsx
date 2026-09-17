import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { AuthProvider, useAuth, useNetworkStatus } from '@/shared/hooks';
import { Loading } from '@/shared/components';
import { OfflineBanner } from '@/shared/components/common/OfflineBanner';
import { View } from 'react-native';
import '../../global.css';

import { MissionAlarmProvider } from '@/shared/contexts/MissionAlarmContext';
import { ResidentAlertProvider } from '@/shared/contexts/ResidentAlertContext';

function RootLayoutNav() {
  const { user, role, isLoading, isAuthenticated } = useAuth();
  const { isOffline } = useNetworkStatus();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (isLoading || !rootNavigationState?.key) return;

    const inAuthGroup = segments[0] === '(responder)' || segments[0] === '(resident)';
    const isLogin = segments[0] === 'login' || segments[0] === 'forgot-password' || segments[0] === 'reset-password';

    if (!isAuthenticated && (inAuthGroup || !segments[0])) {
      // Redirect to login if not authenticated
      router.replace('/login');
    } else if (isAuthenticated) {
      // Redirect to appropriate app if authenticated
      if (role === 'responder' && segments[0] !== '(responder)') {
        router.replace('/(responder)');
      } else if (role === 'resident' && segments[0] !== '(resident)') {
        router.replace('/(resident)');
      } else if (!role && isLogin) {
          // Edge case fallback
          router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, role, segments]);

  if (isLoading || !rootNavigationState?.key) {
    return <Loading fullScreen message="Restoring Session..." />;
  }

  return (
    <MissionAlarmProvider>
      <ResidentAlertProvider>
        {isOffline && <OfflineBanner />}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="(responder)" />
          <Stack.Screen name="(resident)" />
        </Stack>
      </ResidentAlertProvider>
    </MissionAlarmProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
