import React from 'react';
import { View, Text } from 'react-native';
import { CheckCircle2, Users } from 'lucide-react-native';

export function DispatchSummaryCard() {
  return (
    <View className="flex-row gap-3 mb-6">
      {/* Completed Dispatches Card */}
      <View
        className="flex-1 bg-white rounded-2xl p-5 border border-slate-200/70"
        style={{
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.04,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center justify-between mb-3">
          <View className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/60 items-center justify-center">
            <CheckCircle2 size={18} color="#059669" />
          </View>
          <Text className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50/80 px-2 py-0.5 rounded-full">
            TODAY
          </Text>
        </View>
        <Text className="text-3xl font-black text-slate-900 tracking-tight">4</Text>
        <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mt-0.5">
          Completed Missions
        </Text>
      </View>

      {/* Patients Treated Card */}
      <View
        className="flex-1 bg-white rounded-2xl p-5 border border-slate-200/70"
        style={{
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.04,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center justify-between mb-3">
          <View className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/60 items-center justify-center">
            <Users size={18} color="#2563EB" />
          </View>
          <Text className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50/80 px-2 py-0.5 rounded-full">
            SERVED
          </Text>
        </View>
        <Text className="text-3xl font-black text-slate-900 tracking-tight">12</Text>
        <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mt-0.5">
          Patients Assisted
        </Text>
      </View>
    </View>
  );
}
