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
        tabBarActiveTintColor: '#4F46E5',
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
