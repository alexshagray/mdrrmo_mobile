import { LoginScreenConfig } from '@/auth/types/auth';

const currentRole = process.env.EXPO_PUBLIC_APP_ROLE || 'resident';

const responderConfig: LoginScreenConfig = {
  appName: 'MDRRMO Opol Emergency Medical Services',
  subtitle: 'Emergency Medical Services',
  badgeText: '🚑 Responder Portal',
  welcomeTitle: 'Welcome Back, Responder',
  welcomeSubtitle: 'Sign in to receive and manage emergency dispatches.',
  accentColor: '#3B82F6',
  theme: 'light',
  demoEmail: 'responder@test.com'
};

const residentConfig: LoginScreenConfig = {
  appName: 'MDRRMO Opol Emergency Medical Services',
  subtitle: 'Emergency Medical Services',
  badgeText: '🏠 Resident Portal',
  welcomeTitle: 'Welcome Back',
  welcomeSubtitle: 'Sign in to report emergencies and monitor your emergency requests.',
  accentColor: '#3B82F6',
  theme: 'light',
  demoEmail: 'resident@test.com',
  allowRegistration: true
};

export const appConfig = {
  role: currentRole,
  auth: currentRole === 'responder' ? responderConfig : residentConfig,
};
