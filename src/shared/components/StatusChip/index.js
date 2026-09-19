import React from 'react';
import { View, Text } from 'react-native';
import { Clock, CheckCircle, TriangleAlert, AlertTriangle, Circle } from 'lucide-react-native';

const AlertIcon = TriangleAlert || AlertTriangle || Circle;

export function StatusChip({ status, type = 'dispatch', className = '' }) {
  let config = {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    icon: null,
    label: status
  };

  if (type === 'dispatch') {
    switch (status?.toLowerCase()) {
      case 'assigned':
        config = { bg: 'bg-blue-50 border border-blue-200/70', text: 'text-blue-700', icon: <Clock size={12} color="#1D4ED8" />, label: 'Assigned' };
        break;
      case 'accepted':
        config = { bg: 'bg-indigo-50 border border-indigo-200/70', text: 'text-indigo-700', icon: <CheckCircle size={12} color="#4338CA" />, label: 'Accepted' };
        break;
      case 'en_route':
        config = { bg: 'bg-amber-50 border border-amber-200/70', text: 'text-amber-700', icon: <AlertIcon size={12} color="#B45309" />, label: 'En Route' };
        break;
      case 'arrived':
      case 'arrived_on_scene':
        config = { bg: 'bg-emerald-50 border border-emerald-200/70', text: 'text-emerald-700', icon: <CheckCircle size={12} color="#047857" />, label: 'On Scene' };
        break;
      case 'completed':
        config = { bg: 'bg-slate-50 border border-slate-200/70', text: 'text-slate-600', icon: <CheckCircle size={12} color="#475569" />, label: 'Completed' };
        break;
    }
  }

  return (
    <View className={`flex-row items-center space-x-1 px-3 py-1 rounded-full ${config.bg} ${className}`}>
      {config.icon}
      <Text className={`text-xs font-bold ml-1 ${config.text}`}>{config.label}</Text>
    </View>
  );
}
