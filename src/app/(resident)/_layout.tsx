import React from 'react';
import { Tabs } from 'expo-router';
import { Home, TriangleAlert, AlertTriangle, Navigation, User, Circle } from 'lucide-react-native';
import { View, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedTabIcon } from '@/resident/components/navigation/AnimatedTabIcon';

const AlertIcon = TriangleAlert || AlertTriangle || Circle;

export default function ResidentLayout() {
  const insets = useSafeAreaInsets();

  // Adaptive bottom margin: respects Android system navigation (3-button or gesture) and iOS home indicator
  const bottomOffset = Platform.select({
    android: insets.bottom > 0 ? insets.bottom + 4 : 10,
    ios: insets.bottom > 0 ? insets.bottom : 10,
    default: 10,
  });

  return (
    <View className="flex-1 bg-slate-50">
      <Tabs
        backBehavior="history"
        screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: bottomOffset,
          left: 18,
          right: 18,
          elevation: 8,
          backgroundColor: '#FFFFFF',
          borderRadius: 22,
          height: 56,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 14,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          paddingBottom: 0,
          paddingTop: 0,
          paddingHorizontal: 4,
          alignItems: 'center',
          justifyContent: 'space-around',
        },
        tabBarItemStyle: {
          height: 56,
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 0,
          paddingTop: 0,
          paddingBottom: 0,
        },
        tabBarIconStyle: {
          width: '100%',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarButton: (props: any) => {
          const { ref, ...rest } = props;
          return (
            <Pressable
              ref={ref}
              {...rest}
              style={({ pressed }) => [
                props.style,
                {
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingTop: 0,
                  paddingBottom: 0,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            />
          );
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#208AEF',
        tabBarInactiveTintColor: '#64748B',
        sceneStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon focused={focused} IconComponent={Home} label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon focused={focused} IconComponent={AlertIcon} label="Report" />
          ),
        }}
      />
      <Tabs.Screen
        name="track"
        options={{
          title: 'Track',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon focused={focused} IconComponent={Navigation} label="Track" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon focused={focused} IconComponent={User} label="Profile" />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="personal-info"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="emergency-info"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="my-reports"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="report-details"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="location-privacy"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="account-security"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="help-support"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
    </View>
  );
}
