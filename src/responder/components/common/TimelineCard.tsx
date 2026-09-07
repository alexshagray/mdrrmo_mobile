import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '@/shared/components';

export function TimelineCard({ events }: { events?: any[] }) {
  const defaultEvents = [
    { time: '10:45 AM', title: 'Dispatched', description: 'Unit assigned by command center', active: false },
    { time: '10:46 AM', title: 'Accepted', description: 'Unit accepted assignment', active: false },
    { time: '10:48 AM', title: 'En Route', description: 'Unit is en route to scene', active: true },
    { time: '--:--', title: 'Arrived', description: 'Pending arrival', active: false },
  ];

  const data = events || defaultEvents;

  return (
    <Card className="mb-4">
      <Text className="text-slate-800 font-bold text-lg mb-4">Dispatch Timeline</Text>
      <View className="ml-2">
        {data.map((event, index) => (
          <View key={index} className="flex-row mb-4 last:mb-0">
            <View className="items-center mr-4">
              <View className={`w-3 h-3 rounded-full ${event.active ? 'bg-blue-600' : 'bg-slate-300'}`} />
              {index !== data.length - 1 && <View className="w-0.5 h-full bg-slate-200 mt-1" />}
            </View>
            <View className="flex-1 pb-4">
              <View className="flex-row justify-between items-center mb-1">
                <Text className={`font-bold ${event.active ? 'text-slate-900' : 'text-slate-600'}`}>{event.title}</Text>
                <Text className="text-xs text-slate-500 font-medium">{event.time}</Text>
              </View>
              <Text className="text-slate-500 text-sm">{event.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}
