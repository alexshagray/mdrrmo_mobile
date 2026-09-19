import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { StatusChip } from '@/shared/components';
import { MapPin, Clock, AlertTriangle, ArrowRight, Navigation } from 'lucide-react-native';

interface DispatchCardProps {
  dispatch?: any;
  onPress?: () => void;
  onDetails?: () => void;
}

export function DispatchCard({ dispatch, onPress, onDetails }: DispatchCardProps) {
  const data = dispatch || {
    id: 'DSP-2026-089',
    type: 'Medical Emergency',
    priority: 'High',
    location: 'Brgy. Poblacion, Opol',
    status: 'Assigned',
    time: '10:45 AM',
  };

  const isUrgent = data.status === 'assigned';
  const isEnRoute = data.status === 'accepted' || data.status === 'en_route';

  return (
    <View
      className="bg-white rounded-3xl p-6 border border-slate-200/80 mb-6"
      style={{
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 14,
        elevation: 3,
      }}
    >
      {/* Top Header Badge & Status */}
      <View className="flex-row justify-between items-center mb-3.5">
        <View className="flex-row items-center bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/60">
          <AlertTriangle size={12} color="#DC2626" />
          <Text className="text-slate-600 font-bold tracking-wider text-[11px] uppercase ml-1.5">
            {typeof data.id === 'number' ? `DSP-00${data.id}` : data.id}
          </Text>
        </View>
        <StatusChip status={data.status} />
      </View>

      {/* Incident Name */}
      <Text className="text-slate-900 text-xl font-black tracking-tight mb-4">
        {data.type}
      </Text>

      {/* Details (Location & Dispatch Time) */}
      <View className="space-y-2 mb-5">
        <View className="flex-row items-start">
          <View className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200/60 items-center justify-center mr-2.5 mt-0.5">
            <MapPin size={14} color="#64748B" />
          </View>
          <Text className="text-slate-700 font-semibold text-sm flex-1 leading-5" numberOfLines={3}>
            {data.location}
          </Text>
        </View>

        <View className="flex-row items-center mt-1.5">
          <View className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200/60 items-center justify-center mr-2.5">
            <Clock size={14} color="#64748B" />
          </View>
          <Text className="text-slate-400 font-medium text-xs">
            {data.time ? `Dispatched at ${data.time}` : 'Dispatched Recently'}
          </Text>
        </View>
      </View>

      {/* Primary Action Button */}
      <TouchableOpacity
        onPress={onDetails || (() => {})}
        activeOpacity={0.85}
        className={`py-3.5 px-5 rounded-2xl flex-row items-center justify-center ${
          isUrgent
            ? 'bg-rose-600 active:bg-rose-700'
            : isEnRoute
            ? 'bg-slate-900 active:bg-slate-800'
            : 'bg-emerald-600 active:bg-emerald-700'
        }`}
        style={{
          shadowColor: isUrgent ? '#E11D48' : '#0F172A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        {isEnRoute ? (
          <Navigation size={15} color="#FFFFFF" style={{ marginRight: 8 }} />
        ) : null}
        <Text className="text-white font-bold tracking-wider text-xs mr-2">
          {data.status === 'assigned'
            ? 'REVIEW & ACCEPT MISSION'
            : data.status === 'accepted' || data.status === 'en_route'
            ? 'OPEN MAP & NAVIGATE'
            : data.status === 'arrived_on_scene'
            ? 'OPEN PATIENT CARE RECORD'
            : 'VIEW MISSION DETAILS'}
        </Text>
        <ArrowRight size={15} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}
