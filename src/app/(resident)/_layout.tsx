import React from 'react';
import { Tabs } from 'expo-router';
import { Home, TriangleAlert, AlertTriangle, Navigation, Bell, User, Circle } from 'lucide-react-native';
import { View } from 'react-native';
import { AnimatedTabIcon } from '@/resident/components/navigation/AnimatedTabIcon';

const AlertIcon = TriangleAlert || AlertTriangle || Circle;

export default function ResidentLayout() {
  return (
    <View className="flex-1 bg-slate-50">
      <Tabs
        screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 18,
          left: 20,
          right: 20,
          elevation: 6,
          backgroundColor: '#FFFFFF',
          borderRadius: 28,
          height: 60,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: '#F1F5F9',
          paddingBottom: 0,
          paddingHorizontal: 6,
          alignItems: 'center',
          justifyContent: 'space-around',
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#0F172A',
        tabBarInactiveTintColor: '#94A3B8',
        sceneStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon focused={focused} IconComponent={Home} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon focused={focused} IconComponent={AlertIcon} />
          ),
        }}
      />
      <Tabs.Screen
        name="track"
        options={{
          title: 'Track',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon focused={focused} IconComponent={Navigation} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon focused={focused} IconComponent={Bell} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon focused={focused} IconComponent={User} />
          ),
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
