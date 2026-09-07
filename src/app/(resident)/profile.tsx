import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header, Avatar } from '@/shared/components';
import { Settings, Shield, Bell, LogOut, MapPin, Phone, ChevronRight, Edit3 } from 'lucide-react-native';
import { useAuth } from '@/shared/hooks';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  
  const userName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.name || 'Resident');
  const userPhone = user?.phone || user?.contact_number || '+63 912 345 6789';
  
  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={['top']}>
      <Header title="Profile" className="bg-transparent" />
      
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Profile Header section */}
        <View className="items-center mt-2 mb-8 relative">
          <View className="relative">
            <Avatar name={userName} size="xl" className="bg-indigo-100 text-indigo-600 border-4 border-white shadow-sm" />
            <TouchableOpacity className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-sm border border-slate-100">
              <Edit3 size={16} color="#64748B" strokeWidth={2.25} />
            </TouchableOpacity>
          </View>
          <Text className="text-2xl font-bold text-slate-900 mt-4 tracking-tight">{userName}</Text>
          <Text className="text-slate-500 font-medium mt-0.5">{userPhone}</Text>
        </View>

        <Text className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">Account Info</Text>
        
        {/* Home Address */}
        <TouchableOpacity activeOpacity={0.7} className="bg-white rounded-[20px] p-4 flex-row items-center mb-6 shadow-sm border border-slate-100/50" style={{ shadowColor: '#64748B', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
          <View className="w-12 h-12 rounded-[18px] bg-indigo-50 items-center justify-center mr-4">
            <MapPin size={22} color="#4F46E5" strokeWidth={2.25} />
          </View>
          <View className="flex-1 pr-2">
            <Text className="font-bold text-slate-900 text-[15px] mb-0.5">Primary Residence</Text>
            <Text className="text-slate-500 text-[13px] leading-5">Zone 3, Brgy. Igpit, Opol, Misamis Oriental</Text>
          </View>
          <ChevronRight size={20} color="#CBD5E1" strokeWidth={2.25} />
        </TouchableOpacity>

        <Text className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">Emergency Contacts</Text>
        
        {/* Emergency Contacts */}
        <View className="bg-white rounded-[20px] p-4 mb-6 shadow-sm border border-slate-100/50" style={{ shadowColor: '#64748B', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
          <TouchableOpacity activeOpacity={0.7} className="flex-row items-center">
            <View className="w-12 h-12 rounded-full bg-emerald-50 items-center justify-center mr-4">
              <Phone size={22} color="#059669" strokeWidth={2.25} />
            </View>
            <View className="flex-1 pr-2">
              <Text className="font-bold text-slate-900 text-[15px] mb-0.5">Jose Santos</Text>
              <Text className="text-slate-500 text-[13px]">Husband • 0987 654 3210</Text>
            </View>
            <ChevronRight size={20} color="#CBD5E1" strokeWidth={2.25} />
          </TouchableOpacity>
        </View>

        <Text className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">Preferences</Text>
        
        {/* Settings */}
        <View className="bg-white rounded-[20px] mb-8 shadow-sm border border-slate-100/50 overflow-hidden" style={{ shadowColor: '#64748B', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
          <TouchableOpacity activeOpacity={0.7} className="flex-row items-center p-4 border-b border-slate-100">
            <View className="w-10 h-10 rounded-[14px] bg-sky-50 items-center justify-center mr-4">
              <Bell size={20} color="#0284C7" strokeWidth={2.25} />
            </View>
            <Text className="flex-1 font-semibold text-slate-800 text-[15px]">Push Notifications</Text>
            <ChevronRight size={20} color="#CBD5E1" strokeWidth={2.25} />
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.7} className="flex-row items-center p-4 border-b border-slate-100">
            <View className="w-10 h-10 rounded-[14px] bg-slate-50 items-center justify-center mr-4">
              <Shield size={20} color="#475569" strokeWidth={2.25} />
            </View>
            <Text className="flex-1 font-semibold text-slate-800 text-[15px]">Privacy & Data</Text>
            <ChevronRight size={20} color="#CBD5E1" strokeWidth={2.25} />
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.7} className="flex-row items-center p-4">
            <View className="w-10 h-10 rounded-[14px] bg-slate-50 items-center justify-center mr-4">
              <Settings size={20} color="#475569" strokeWidth={2.25} />
            </View>
            <Text className="flex-1 font-semibold text-slate-800 text-[15px]">Account Settings</Text>
            <ChevronRight size={20} color="#CBD5E1" strokeWidth={2.25} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          activeOpacity={0.7}
          className="bg-red-50 rounded-[20px] p-4 flex-row justify-center items-center mb-4 border border-red-100"
          onPress={logout}
        >
          <LogOut size={20} color="#E11D48" strokeWidth={2.25} />
          <Text className="text-red-600 font-bold text-[15px] ml-2">Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
