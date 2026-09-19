import React from 'react';
import { View, Text } from 'react-native';
import { Avatar } from '@/shared/components';
import { Users2, Shield } from 'lucide-react-native';

export function CrewCard({
  crew,
  teamName,
  currentUserId,
}: {
  crew?: any[];
  teamName?: string;
  currentUserId?: number;
}) {
  if (!crew || crew.length === 0) {
    return (
      <View
        className="bg-white rounded-3xl p-6 border border-slate-200/70 mb-8"
        style={{
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.04,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center mb-3">
          <View className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/60 items-center justify-center mr-2.5">
            <Users2 size={16} color="#64748B" />
          </View>
          <Text className="text-slate-800 font-bold text-base tracking-tight">Active Crew</Text>
        </View>
        <Text className="text-slate-400 font-medium text-xs">Scanning for team roster...</Text>
      </View>
    );
  }

  return (
    <View
      className="bg-white rounded-3xl p-6 border border-slate-200/70 mb-8"
      style={{
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      {/* Header */}
      <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-slate-100">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/60 items-center justify-center mr-2.5">
            <Users2 size={16} color="#475569" />
          </View>
          <Text className="text-slate-900 font-bold text-base tracking-tight">Team Roster</Text>
        </View>
        {teamName && (
          <View className="bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-full">
            <Text className="text-slate-600 font-bold text-[10px] uppercase tracking-widest">
              TEAM {teamName}
            </Text>
          </View>
        )}
      </View>

      {/* Roster Items */}
      <View className="space-y-1">
        {crew.map((member, index) => {
          const isMe = member.id === currentUserId;
          const isOnline = member.availability === 'available' || member.availability === 'busy';
          const isLast = index === crew.length - 1;

          return (
            <View
              key={member.id}
              className={`flex-row items-center py-2.5 ${!isLast ? 'border-b border-slate-50' : ''}`}
            >
              <View className="relative">
                <Avatar name={member.name} size="sm" />
                {/* Clean status presence dot */}
                <View
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                    isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
              </View>

              <View className="ml-3.5 flex-1">
                <View className="flex-row items-center">
                  <Text
                    className={`font-bold text-[14px] ${
                      isMe ? 'text-slate-900' : 'text-slate-700'
                    }`}
                  >
                    {member.name}
                  </Text>
                  {isMe && (
                    <View className="ml-2 bg-slate-100 px-1.5 py-0.5 rounded-md">
                      <Text className="text-slate-600 text-[9px] font-bold tracking-widest">YOU</Text>
                    </View>
                  )}
                </View>
                <Text className="text-slate-400 text-[11px] font-medium tracking-wide mt-0.5">
                  {member.role}
                </Text>
              </View>

              {/* Status Pill */}
              <View
                className={`px-2 py-0.5 rounded-full border ${
                  isOnline
                    ? 'bg-emerald-50 border-emerald-200/60'
                    : 'bg-slate-50 border-slate-200/60'
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    isOnline ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  {isOnline ? 'ACTIVE' : 'OFFLINE'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
