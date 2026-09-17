import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Map as MapIcon, UserCircle, ClipboardList, User } from 'lucide-react-native';
import { View } from 'react-native';

export default function ResponderLayout() {
  return (
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
        tabBarActiveTintColor: '#dc2626',
        tabBarInactiveTintColor: '#94A3B8',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <View className={`p-2 rounded-xl ${focused ? 'bg-responder-primary/10' : ''}`}>
              <Home color={color} size={24} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="dispatch"
        options={{
          title: 'Dispatch',
          tabBarIcon: ({ color, focused }) => (
            <View className={`p-2 rounded-xl ${focused ? 'bg-responder-primary/10' : ''}`}>
              <MapIcon color={color} size={24} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="patient"
        options={{
          title: 'Patient',
          tabBarIcon: ({ color, focused }) => (
            <View className={`p-2 rounded-xl ${focused ? 'bg-responder-primary/10' : ''}`}>
              <UserCircle color={color} size={24} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <View className={`p-2 rounded-xl ${focused ? 'bg-responder-primary/10' : ''}`}>
              <ClipboardList color={color} size={24} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View className={`p-2 rounded-xl ${focused ? 'bg-responder-primary/10' : ''}`}>
              <User color={color} size={24} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="navigation"
        options={{
          href: null, // This hides it from the bottom tab bar
          tabBarStyle: { display: 'none' } // Hides the bottom bar when navigating
        }}
      />
      <Tabs.Screen
        name="account-security"
        options={{
          href: null,
          tabBarStyle: { display: 'none' }
        }}
      />
      <Tabs.Screen
        name="help-support"
        options={{
          href: null,
          tabBarStyle: { display: 'none' }
        }}
      />
    </Tabs>
  );
}
