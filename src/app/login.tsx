import React from 'react';
import { LoginScreen } from '@/auth';
import { appConfig } from '@/shared/constants';

export default function AppLoginScreen() {
  return <LoginScreen config={appConfig.auth} />;
}
