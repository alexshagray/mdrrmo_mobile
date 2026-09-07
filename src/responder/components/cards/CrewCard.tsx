import React from 'react';
import { View, Text } from 'react-native';
import { Avatar } from '@/shared/components';
import { Users2 } from 'lucide-react-native';

export function CrewCard({ crew, teamName, currentUserId }: { crew?: any[], teamName?: string, currentUserId?: number }) {
  if (!crew || crew.length === 0) {
     return (
       <View className="bg-white rounded-[28px] p-6 shadow-sm border border-slate-100 mb-8">
         <View className="flex-row items-center mb-4">
           <Users2 size={20} color="#64748B" />
           <Text className="text-slate-800 font-black text-lg ml-2 tracking-tight">Active Crew</Text>
         </View>
         <Text className="text-slate-500 font-medium">Scanning for team members...</Text>
       </View>
     );
  }

  return (
    <View className="bg-white rounded-[28px] p-6 shadow-sm border border-slate-100 mb-8">
      <View className="flex-row justify-between items-center mb-6">
         <View className="flex-row items-center">
           <View className="bg-slate-100 p-2 rounded-xl mr-3 border border-slate-200/60">
             <Users2 size={20} color="#3B82F6" />
           </View>
           <Text className="text-slate-800 font-black text-xl tracking-tight">Team Roster</Text>
         </View>
         {teamName && (
           <View className="bg-blue-50 border border-blue-200/60 px-3 py-1.5 rounded-full">
             <Text className="text-blue-600 font-black text-[11px] uppercase tracking-widest">TEAM {teamName}</Text>
           </View>
         )}
      </View>
      <View className="space-y-1">
        {crew.map((member, index) => {
          const isMe = member.id === currentUserId;
          const isOnline = member.availability === 'available' || member.availability === 'busy';
          const isLast = index === crew.length - 1;
          return (
          <View key={member.id} className={`flex-row items-center py-3 ${!isLast ? 'border-b border-slate-100' : ''}`}>
            <View className="relative">
              <Avatar name={member.name} size="sm" />
              {/* Online indicator dot */}
              <View className={`absolute bottom-0 right-0 w-3.5 h-3.5 ${isOnline ? 'bg-green-500' : 'bg-slate-300'} border-2 border-white rounded-full`} />
            </View>
            <View className="ml-4 flex-1">
              <View className="flex-row items-center">
                <Text className={`font-black text-[15px] ${isMe ? 'text-blue-700' : 'text-slate-800'}`}>{member.name}</Text>
                {isMe && (
                  <View className="ml-2 bg-blue-100/80 border border-blue-200 px-1.5 py-0.5 rounded flex-row items-center">
                    <Text className="text-blue-700 text-[9px] font-black tracking-widest">ME</Text>
                  </View>
                )}
              </View>
              <Text className="text-slate-500 text-[10px] font-bold tracking-wide uppercase mt-0.5">{member.role}</Text>
            </View>
          </View>
        )})}
      </View>
    </View>
  );
}
