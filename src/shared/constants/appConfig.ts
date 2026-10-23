import { LoginScreenConfig } from '@/auth/types/auth';

const currentRole = process.env.EXPO_PUBLIC_APP_ROLE || 'resident';

const responderConfig: LoginScreenConfig = {
  appName: 'OPOL RESQ',
  subtitle: 'Every Second. Every Life. • MDRRMO Opol',
  badgeText: '🚑 Responder Portal',
  welcomeTitle: 'Welcome Back, Responder',
  welcomeSubtitle: 'Sign in to receive and coordinate emergency dispatches.',
  accentColor: '#3B82F6',
  theme: 'light',
  demoEmail: 'responder@test.com'
};

const residentConfig: LoginScreenConfig = {
  appName: 'OPOL RESQ',
  subtitle: 'Every Second. Every Life. • MDRRMO Opol',
  badgeText: '🏠 Resident Portal',
  welcomeTitle: 'Welcome Back',
  welcomeSubtitle: 'Sign in to report emergencies and monitor live response teams.',
  accentColor: '#3B82F6',
  theme: 'light',
  demoEmail: 'resident@test.com',
  allowRegistration: true
};

export const appConfig = {
  appName: 'OPOL RESQ',
  tagline: 'Every Second. Every Life.',
  organization: 'MDRRMO Opol',
  role: currentRole,
  auth: currentRole === 'responder' ? responderConfig : residentConfig,
};
