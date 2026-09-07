export interface LoginScreenConfig {
  appName: string;
  subtitle: string;
  badgeText?: string;
  accentColor?: string;
  demoEmail?: string;
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  logo?: any;
  theme?: 'light' | 'dark' | 'system';
  allowRegistration?: boolean;
}
