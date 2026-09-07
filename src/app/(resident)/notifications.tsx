import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header, SearchBar } from '@/shared/components';
import { NotificationCard } from '@/resident/components/cards/NotificationCard';

export default function NotificationsScreen() {
  const notifications = [
    { id: 1, title: 'Ambulance En Route', message: 'Unit Alpha has been dispatched and is on the way to your location.', time: '2 mins ago', type: 'info' },
    { id: 2, title: 'Report Verified', message: 'Your report RPT-2026-105 has been verified by the command center.', time: '5 mins ago', type: 'success' },
    { id: 3, title: 'Weather Advisory', message: 'Heavy rainfall expected in Opol within the next 2 hours. Please take precautions.', time: '1 hr ago', type: 'warning' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={['top']}>
      <Header title="Notifications" className="bg-transparent" />
      
      <View className="px-4 mb-4">
        <SearchBar placeholder="Search alerts..." />
      </View>

      <View className="px-4 mb-4 flex-row space-x-2">
        <TouchableOpacity className="bg-blue-600 px-4 py-1.5 rounded-full">
          <Text className="text-white font-medium">All</Text>
        </TouchableOpacity>
        <TouchableOpacity className="bg-slate-200 px-4 py-1.5 rounded-full">
          <Text className="text-slate-700 font-medium">Updates</Text>
        </TouchableOpacity>
        <TouchableOpacity className="bg-slate-200 px-4 py-1.5 rounded-full">
          <Text className="text-slate-700 font-medium">Advisories</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {notifications.map((notif) => (
          <NotificationCard key={notif.id} notification={notif} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
