import React from 'react';
import { Tabs } from 'expo-router';
import { Home, TriangleAlert, AlertTriangle, MapPin, Bell, User, Circle } from 'lucide-react-native';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedTabIcon } from '@/resident/components/navigation/AnimatedTabIcon';

const AlertIcon = TriangleAlert || AlertTriangle || Circle;

export default function ResidentLayout() {
  return (
    <View className="flex-1">
      <LinearGradient 
        colors={['#EEF2FF', '#E0E7FF', '#C7D2FE']} 
        className="absolute inset-0" 
      />
      <Tabs
        screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          elevation: 0,
          backgroundColor: '#ffffff',
          borderRadius: 24,
          height: 64,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          borderTopWidth: 0,
          paddingBottom: 0,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#94A3B8',
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} color={color} IconComponent={Home} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} color={color} IconComponent={AlertIcon} />
          ),
        }}
      />
      <Tabs.Screen
        name="track"
        options={{
          title: 'Track',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} color={color} IconComponent={MapPin} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} color={color} IconComponent={Bell} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} color={color} IconComponent={User} />
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
