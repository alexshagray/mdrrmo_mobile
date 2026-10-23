/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1E293B',
    background: '#F8FAFC',
    backgroundElement: '#F1F5F9',
    backgroundSelected: '#E0EFFF',
    textSecondary: '#64748B',
    residentPrimary: '#208AEF',
    residentSecondary: '#FF3B30',
    residentBackground: '#F8FAFC',
    responderPrimary: '#FF3B30',
    responderBackground: '#F8FAFC',
    responderSurface: '#FFFFFF',
  },
  dark: {
    text: '#F8FAFC',
    background: '#0B132B',
    backgroundElement: '#1C2541',
    backgroundSelected: '#1E3A8A',
    textSecondary: '#94A3B8',
    residentPrimary: '#208AEF',
    residentSecondary: '#FF3B30',
    residentBackground: '#0B132B',
    responderPrimary: '#FF3B30',
    responderBackground: '#0B132B',
    responderSurface: '#1C2541',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
