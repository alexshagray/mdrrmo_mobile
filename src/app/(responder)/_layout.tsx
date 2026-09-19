import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Home, Map as MapIcon, UserCircle, ClipboardList, User } from 'lucide-react-native';
import { View } from 'react-native';
import { getActiveDispatches } from '@/shared/api/dispatches';
import { useLiveDispatchTracking } from '@/shared/hooks';
import { useMissionAlarm } from '@/shared/contexts/MissionAlarmContext';

export default function ResponderLayout() {
  const [activeDispatch, setActiveDispatch] = useState<any>(null);
  const { missionRefreshTrigger } = useMissionAlarm();

  useEffect(() => {
    let isMounted = true;
    getActiveDispatches().then(res => {
      if (isMounted && res?.data && res.data.length > 0) {
        setActiveDispatch(res.data[0]);
      } else if (isMounted) {
        setActiveDispatch(null);
      }
    }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [missionRefreshTrigger]);

  useLiveDispatchTracking(activeDispatch?.id, activeDispatch?.dispatch_status, { driverId: activeDispatch?.driver_id });
  return (
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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <View className={`px-3 py-1.5 rounded-full items-center justify-center ${focused ? 'bg-slate-900' : ''}`}>
              <Home color={focused ? '#FFFFFF' : '#94A3B8'} size={20} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="dispatch"
        options={{
          title: 'Dispatch',
          tabBarIcon: ({ focused }) => (
            <View className={`px-3 py-1.5 rounded-full items-center justify-center ${focused ? 'bg-slate-900' : ''}`}>
              <MapIcon color={focused ? '#FFFFFF' : '#94A3B8'} size={20} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="patient"
        options={{
          title: 'Patient',
          tabBarIcon: ({ focused }) => (
            <View className={`px-3 py-1.5 rounded-full items-center justify-center ${focused ? 'bg-slate-900' : ''}`}>
              <UserCircle color={focused ? '#FFFFFF' : '#94A3B8'} size={20} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => (
            <View className={`px-3 py-1.5 rounded-full items-center justify-center ${focused ? 'bg-slate-900' : ''}`}>
              <ClipboardList color={focused ? '#FFFFFF' : '#94A3B8'} size={20} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <View className={`px-3 py-1.5 rounded-full items-center justify-center ${focused ? 'bg-slate-900' : ''}`}>
              <User color={focused ? '#FFFFFF' : '#94A3B8'} size={20} strokeWidth={focused ? 2.5 : 2} />
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
