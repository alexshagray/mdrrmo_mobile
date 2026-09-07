import React from 'react';
import { View, Text } from 'react-native';
import { CheckCircle2, Users } from 'lucide-react-native';

export function DispatchSummaryCard() {
  return (
    <View className="flex-row space-x-3 mb-6">
      
      {/* Completed Dispatches Card */}
      <View className="flex-1 bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 relative overflow-hidden">
        {/* Decorative Background Blob */}
        <View className="absolute -top-6 -right-6 bg-blue-50/80 w-24 h-24 rounded-full" />
        
        <View className="bg-blue-100/60 w-12 h-12 rounded-2xl items-center justify-center mb-4 border border-blue-200/50">
          <CheckCircle2 size={22} color="#3B82F6" />
        </View>
        <Text className="text-4xl font-black text-slate-800 tracking-tighter">4</Text>
        <Text className="text-slate-400 text-[11px] font-black uppercase tracking-widest mt-1">Completed</Text>
      </View>
      
      {/* Patients Treated Card */}
      <View className="flex-1 bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 relative overflow-hidden">
        {/* Decorative Background Blob */}
        <View className="absolute -top-6 -right-6 bg-green-50/80 w-24 h-24 rounded-full" />
        
        <View className="bg-green-100/60 w-12 h-12 rounded-2xl items-center justify-center mb-4 border border-green-200/50">
          <Users size={22} color="#10B981" />
        </View>
        <Text className="text-4xl font-black text-slate-800 tracking-tighter">12</Text>
        <Text className="text-slate-400 text-[11px] font-black uppercase tracking-widest mt-1">Patients</Text>
      </View>

    </View>
  );
}
