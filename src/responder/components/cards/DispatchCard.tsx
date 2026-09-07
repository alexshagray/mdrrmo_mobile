import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { StatusChip } from '@/shared/components';
import { MapPin, Clock, AlertTriangle, ArrowRight } from 'lucide-react-native';

interface DispatchCardProps {
  dispatch?: any;
  onPress?: () => void;
  onDetails?: () => void;
}

export function DispatchCard({ dispatch, onPress, onDetails }: DispatchCardProps) {
  // UI Placeholder fallback
  const data = dispatch || {
    id: 'DSP-2026-089',
    type: 'Medical Emergency',
    priority: 'High',
    location: 'Brgy. Poblacion, Opol',
    status: 'Assigned',
    time: '10:45 AM'
  };

  return (
    <View className="bg-white rounded-[28px] p-6 shadow-sm border border-slate-100 mb-8 relative overflow-hidden">
      {/* Decorative Red Accent */}
      <View className="absolute left-0 top-0 bottom-0 w-[5px] bg-red-500" />
      
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
          <AlertTriangle size={14} color="#EF4444" />
          <Text className="text-slate-600 font-black tracking-widest text-[10px] uppercase ml-1.5">
            {typeof data.id === 'number' ? `DSP-00${data.id}` : data.id}
          </Text>
        </View>
        <StatusChip status={data.status} />
      </View>

      <Text className="text-slate-900 text-2xl font-black tracking-tighter mb-5">
        {data.type}
      </Text>

      <View className="space-y-2.5 mb-6">
        <View className="flex-row items-center">
          <View className="bg-slate-100 p-2 rounded-xl mr-3 border border-slate-200/50">
            <MapPin size={16} color="#3B82F6" />
          </View>
          <Text className="text-slate-700 font-bold tracking-tight text-[15px] flex-1">{data.location}</Text>
        </View>
        
        <View className="flex-row items-center">
          <View className="bg-slate-100 p-2 rounded-xl mr-3 border border-slate-200/50">
            <Clock size={16} color="#F59E0B" />
          </View>
          <Text className="text-slate-500 font-bold tracking-tight text-[14px]">
            {data.time ? `Dispatched at ${data.time}` : 'Dispatched Recently'}
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        onPress={onDetails || (() => {})}
        activeOpacity={0.8}
        className="bg-blue-600 py-4 px-6 rounded-2xl flex-row items-center justify-center border border-blue-500/50 shadow-sm shadow-blue-500/30"
      >
        <Text className="text-blue-50 font-black tracking-widest text-xs mr-2">VIEW MISSION DETAILS</Text>
        <ArrowRight size={16} color="#EFF6FF" />
      </TouchableOpacity>
    </View>
  );
}
