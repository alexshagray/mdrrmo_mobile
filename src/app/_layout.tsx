import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { AuthProvider, useAuth, useNetworkStatus } from '@/shared/hooks';
import { Loading } from '@/shared/components';
import { OfflineBanner } from '@/shared/components/common/OfflineBanner';
import { View } from 'react-native';
import '../../global.css';

import { MissionAlarmProvider } from '@/shared/contexts/MissionAlarmContext';

function RootLayoutNav() {
  const { user, role, isLoading, isAuthenticated } = useAuth();
  const { isOffline } = useNetworkStatus();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (isLoading || !rootNavigationState?.key) return;

    const inAuthGroup = segments[0] === '(responder)' || segments[0] === '(resident)';
    const isLogin = segments[0] === 'login' || segments[0] === 'forgot-password';

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

  if (isLoading) {
    return <Loading fullScreen message="Restoring Session..." />;
  }

  return (
    <>
      {isOffline && <OfflineBanner />}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="(responder)" />
        <Stack.Screen name="(resident)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <MissionAlarmProvider>
        <RootLayoutNav />
      </MissionAlarmProvider>
    </AuthProvider>
  );
}
