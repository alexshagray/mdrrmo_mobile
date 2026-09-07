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
        config = { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Clock size={12} color="#1E40AF" />, label: 'Assigned' };
        break;
      case 'en_route':
        config = { bg: 'bg-amber-100', text: 'text-amber-800', icon: <AlertIcon size={12} color="#92400E" />, label: 'En Route' };
        break;
      case 'arrived':
        config = { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle size={12} color="#166534" />, label: 'On Scene' };
        break;
      case 'completed':
        config = { bg: 'bg-slate-100', text: 'text-slate-600', icon: <CheckCircle size={12} color="#475569" />, label: 'Completed' };
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
