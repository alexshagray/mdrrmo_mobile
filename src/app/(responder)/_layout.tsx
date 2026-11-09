import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Home, Map as MapIcon, UserCircle, ClipboardList, User } from 'lucide-react-native';
import { View, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getActiveDispatches } from '@/shared/api/dispatches';
import { useLiveDispatchTracking } from '@/shared/hooks';
import { useMissionAlarm } from '@/shared/contexts/MissionAlarmContext';
import { offlineMissionService } from '@/shared/services/offlineMissionService';

export default function ResponderLayout() {
  const insets = useSafeAreaInsets();
  const [activeDispatch, setActiveDispatch] = useState<any>(null);
  const { missionRefreshTrigger } = useMissionAlarm();

  // Adaptive bottom margin: respects Android system navigation (3-button or gesture) and iOS home indicator
  const bottomOffset = Platform.select({
    android: insets.bottom > 0 ? insets.bottom + 4 : 10,
    ios: insets.bottom > 0 ? insets.bottom : 10,
    default: 10,
  });

  useEffect(() => {
    let isMounted = true;

    // First attempt to load cached active mission so offline launch has immediate data
    offlineMissionService.getActiveMission().then((cached) => {
      if (isMounted && cached) {
        setActiveDispatch(cached);
      }
    }).catch(() => {});

    getActiveDispatches().then(res => {
      if (isMounted && res?.data && res.data.length > 0) {
        setActiveDispatch(res.data[0]);
        offlineMissionService.saveActiveMission(res.data[0]);
      } else if (isMounted && !res?.is_offline) {
        // Only clear if confirmed by server (online) that no active dispatches exist
        setActiveDispatch(null);
        offlineMissionService.clearActiveMission();
      }
    }).catch(async () => {
      // Network failed: do not remove active mission; keep cached mission
      if (isMounted) {
        const cached = await offlineMissionService.getActiveMission();
        if (cached) setActiveDispatch(cached);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [missionRefreshTrigger]);

  useLiveDispatchTracking(activeDispatch?.id, activeDispatch?.dispatch_status, { driverId: activeDispatch?.driver_id });
  return (
    <View style={{ flex: 1 }}>
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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <View className={`px-3 py-1.5 rounded-full items-center justify-center ${focused ? 'bg-[#208AEF]' : ''}`}>
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
            <View className={`px-3 py-1.5 rounded-full items-center justify-center ${focused ? 'bg-[#208AEF]' : ''}`}>
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
            <View className={`px-3 py-1.5 rounded-full items-center justify-center ${focused ? 'bg-[#208AEF]' : ''}`}>
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
            <View className={`px-3 py-1.5 rounded-full items-center justify-center ${focused ? 'bg-[#208AEF]' : ''}`}>
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
            <View className={`px-3 py-1.5 rounded-full items-center justify-center ${focused ? 'bg-[#208AEF]' : ''}`}>
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
  </View>
  );
}
