import React from 'react';
import { View, Text } from 'react-native';
import { Clock, CheckCircle, AlertTriangle, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react-native';

export function StatusChip({ status, type = 'dispatch', className = '' }) {
  const normStatus = (status || '').toLowerCase().trim();

  let config = {
    bg: 'bg-slate-100 border border-slate-200',
    text: 'text-slate-700',
    icon: null,
    label: status || 'Unknown'
  };

  if (type === 'dispatch') {
    switch (normStatus) {
      case 'assigned':
        config = { bg: 'bg-blue-50 border border-blue-200/80', text: 'text-[#208AEF]', icon: <Clock size={12} color="#208AEF" />, label: 'Assigned' };
        break;
      case 'accepted':
        config = { bg: 'bg-indigo-50 border border-indigo-200/80', text: 'text-indigo-700', icon: <CheckCircle size={12} color="#4338CA" />, label: 'Accepted' };
        break;
      case 'en_route':
        config = { bg: 'bg-amber-50 border border-amber-200/80', text: 'text-amber-700', icon: <AlertTriangle size={12} color="#B45309" />, label: 'En Route' };
        break;
      case 'arrived':
      case 'arrived_on_scene':
        config = { bg: 'bg-emerald-50 border border-emerald-200/80', text: 'text-emerald-700', icon: <CheckCircle2 size={12} color="#047857" />, label: 'On Scene' };
        break;
      case 'completed':
        config = { bg: 'bg-slate-100 border border-slate-200', text: 'text-slate-700', icon: <CheckCircle size={12} color="#475569" />, label: 'Completed' };
        break;
      case 'cancelled':
        config = { bg: 'bg-rose-50 border border-rose-200/80', text: 'text-rose-700', icon: <XCircle size={12} color="#BE123C" />, label: 'Cancelled' };
        break;
    }
  } else if (type === 'incident') {
    switch (normStatus) {
      case 'pending':
        config = { bg: 'bg-amber-50 border border-amber-200/80', text: 'text-amber-700', icon: <Clock size={12} color="#B45309" />, label: 'Pending' };
        break;
      case 'verified':
        config = { bg: 'bg-blue-50 border border-blue-200/80', text: 'text-[#208AEF]', icon: <CheckCircle size={12} color="#208AEF" />, label: 'Verified' };
        break;
      case 'dispatched':
        config = { bg: 'bg-indigo-50 border border-indigo-200/80', text: 'text-indigo-700', icon: <AlertTriangle size={12} color="#4338CA" />, label: 'Dispatched' };
        break;
      case 'resolved':
        config = { bg: 'bg-emerald-50 border border-emerald-200/80', text: 'text-emerald-700', icon: <CheckCircle2 size={12} color="#047857" />, label: 'Resolved' };
        break;
      case 'rejected':
      case 'cancelled':
        config = { bg: 'bg-rose-50 border border-rose-200/80', text: 'text-rose-700', icon: <XCircle size={12} color="#BE123C" />, label: 'Cancelled' };
        break;
    }
  } else if (type === 'priority') {
    switch (normStatus) {
      case 'critical':
        config = { bg: 'bg-red-50 border border-red-200/80', text: 'text-[#FF3B30]', icon: <ShieldAlert size={12} color="#FF3B30" />, label: 'Critical' };
        break;
      case 'high':
        config = { bg: 'bg-orange-50 border border-orange-200/80', text: 'text-orange-700', icon: <AlertTriangle size={12} color="#C2410C" />, label: 'High' };
        break;
      case 'moderate':
      case 'medium':
        config = { bg: 'bg-amber-50 border border-amber-200/80', text: 'text-amber-700', icon: <AlertTriangle size={12} color="#B45309" />, label: 'Moderate' };
        break;
      case 'low':
        config = { bg: 'bg-slate-100 border border-slate-200', text: 'text-slate-700', icon: null, label: 'Low' };
        break;
    }
  }

  return (
    <View className={`flex-row items-center px-2.5 py-1 rounded-full ${config.bg} ${className}`}>
      {config.icon}
      <Text className={`text-xs font-bold ${config.icon ? 'ml-1.5' : ''} ${config.text}`}>
        {config.label}
      </Text>
    </View>
  );
}

