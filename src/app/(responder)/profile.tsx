import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Settings,
  Shield,
  Bell,
  LogOut,
  ChevronRight,
  Activity,
  Camera,
  History,
  Lock,
  PhoneCall,
  Mail,
  Smartphone,
  ShieldAlert,
  Award,
} from 'lucide-react-native';
import { useAuth } from '@/shared/hooks';
import { Avatar } from '@/shared/components';

export default function ResponderProfileScreen() {
  const router = useRouter();
  const { user, logout, isOnDuty, toggleDutyStatus } = useAuth();

  const fullName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Emergency Responder'
    : 'Emergency Responder';
  const roleName = 'Emergency Responder';
  const badge = user?.badge_number || `MDRRMO-${user?.id?.toString().padStart(4, '0') || '0000'}`;
  const email = user?.email || 'responder@opol.gov.ph';
  const phone = user?.phone_number || user?.phone || 'No phone registered';
  const photoUrl = user?.profile_photo_url;

  const handleLogout = () => {
    Alert.alert(
      'Sign Out Confirmation',
      'Are you sure you want to go off-duty and sign out of your responder terminal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0B1120]" edges={['top']}>
      {/* Top Header Label */}
      <View className="px-5 py-3 flex-row items-center justify-between border-b border-slate-800/80 bg-[#0F172A]/90">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 items-center justify-center mr-2.5">
            <ShieldAlert size={16} color="#F43F5E" />
          </View>
          <Text className="text-white font-extrabold text-sm tracking-widest uppercase">
            RESPONDER PROFILE
          </Text>
        </View>
        <View className="bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-full">
          <Text className="text-rose-400 font-extrabold text-[10px] tracking-wider uppercase">
            EMS TERMINAL
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingVertical: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View className="bg-[#0F172A]/90 border border-slate-800 rounded-3xl p-6 mb-5 shadow-xl items-center relative overflow-hidden">
          {/* Subtle red emergency glow */}
          <View className="absolute top-0 right-0 w-36 h-36 bg-rose-600/10 rounded-full blur-2xl pointer-events-none" />

          {/* Profile Photo */}
          <View className="relative mb-3.5">
            <View className="w-24 h-24 rounded-full bg-slate-800 border-4 border-slate-700/80 items-center justify-center shadow-lg overflow-hidden">
              {photoUrl ? (
                <Image
                  source={{ uri: photoUrl }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <Avatar
                  name={fullName}
                  size="xl"
                  className="bg-transparent text-rose-400 font-bold"
                />
              )}
            </View>
          </View>

          {/* Full Name */}
          <Text className="text-2xl font-black text-white text-center tracking-tight mb-1.5">
            {fullName}
          </Text>

          {/* Role & Badge Pills */}
          <View className="flex-row items-center gap-2 mb-3">
            <View className="bg-rose-950/80 border border-rose-700/70 px-3 py-1 rounded-full shadow-sm">
              <Text className="text-rose-300 font-extrabold text-[11px] tracking-widest uppercase">
                {roleName}
              </Text>
            </View>
            <View className="bg-slate-800 border border-slate-700 px-3 py-1 rounded-full shadow-sm">
              <Text className="text-slate-300 font-mono font-bold text-[11px] tracking-wider">
                ID: {badge}
              </Text>
            </View>
          </View>

          {/* Email & Phone */}
          <View className="space-y-1.5 items-center">
            <View className="flex-row items-center">
              <Mail size={13} color="#64748B" className="mr-1.5" />
              <Text className="text-slate-300 text-xs font-medium">{email}</Text>
            </View>

            <View className="flex-row items-center">
              <Smartphone size={13} color="#64748B" className="mr-1.5" />
              <Text className="text-slate-400 text-xs font-medium">{phone}</Text>
            </View>
          </View>
        </View>

        {/* Shift Status Card */}
        <View className="bg-[#0F172A]/90 border border-slate-800 rounded-3xl p-5 mb-5 shadow-lg flex-row justify-between items-center">
          <View className="flex-row items-center flex-1 mr-3">
            <View
              className={`w-12 h-12 rounded-2xl items-center justify-center mr-3.5 border ${
                isOnDuty
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <Activity size={22} color={isOnDuty ? '#10B981' : '#94A3B8'} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="font-black text-white text-base mr-2">Shift Status</Text>
                <View
                  className={`px-2 py-0.5 rounded-full border ${
                    isOnDuty
                      ? 'bg-emerald-950/60 border-emerald-800/80'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-extrabold uppercase ${
                      isOnDuty ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    {isOnDuty ? 'Active' : 'Off-Duty'}
                  </Text>
                </View>
              </View>
              <Text className="text-slate-400 text-xs mt-0.5 leading-snug">
                {isOnDuty
                  ? 'Ready and available for emergency dispatch'
                  : 'Standby mode / unavailable for dispatch'}
              </Text>
            </View>
          </View>

          <Switch
            value={isOnDuty}
            onValueChange={toggleDutyStatus}
            trackColor={{ true: '#10B981', false: '#334155' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Qualifications Section */}
        <Text className="text-slate-400 font-extrabold text-xs uppercase tracking-wider mb-2.5 ml-1">
          Responder Qualifications
        </Text>

        <View className="bg-[#0F172A]/80 border border-slate-800 rounded-3xl p-5 mb-6 shadow-lg">
          <View className="flex-row items-center mb-3.5">
            <View className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 items-center justify-center mr-3.5">
              <Shield size={19} color="#3B82F6" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-white text-sm">Emergency Medical Technician</Text>
              <Text className="text-slate-400 text-xs mt-0.5">EMT-Basic Certified • DOH Accredited</Text>
            </View>
          </View>

          <View className="h-[1px] bg-slate-800/80 w-full mb-3.5" />

          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 items-center justify-center mr-3.5">
              <Award size={19} color="#818CF8" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-white text-sm">Basic Life Support (BLS)</Text>
              <Text className="text-slate-400 text-xs mt-0.5">CPR & Automated External Defibrillator (AED)</Text>
            </View>
          </View>
        </View>

        {/* Responder Navigation Cards */}
        <Text className="text-slate-400 font-extrabold text-xs uppercase tracking-wider mb-2.5 ml-1">
          Operations & Settings
        </Text>

        <View className="bg-[#0F172A]/80 border border-slate-800 rounded-3xl overflow-hidden mb-6 shadow-lg">
          {/* Dispatch History */}
          <TouchableOpacity
            onPress={() => router.push('/(responder)/history')}
            className="flex-row items-center justify-between p-4.5 border-b border-slate-800/80 active:bg-slate-850"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 items-center justify-center mr-3.5">
                <History size={19} color="#F59E0B" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-sm">Dispatch History</Text>
                <Text className="text-slate-400 text-[11px] mt-0.5">
                  Completed emergency missions & logs
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#64748B" />
          </TouchableOpacity>

          {/* Account & Security */}
          <TouchableOpacity
            onPress={() => router.push('/(responder)/account-security')}
            className="flex-row items-center justify-between p-4.5 border-b border-slate-800/80 active:bg-slate-850"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 items-center justify-center mr-3.5">
                <Lock size={19} color="#94A3B8" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-sm">Account & Security</Text>
                <Text className="text-slate-400 text-[11px] mt-0.5">
                  Update terminal access password
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#64748B" />
          </TouchableOpacity>

          {/* Help & SOP Guidelines */}
          <TouchableOpacity
            onPress={() => router.push('/(responder)/help-support')}
            className="flex-row items-center justify-between p-4.5 active:bg-slate-850"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 items-center justify-center mr-3.5">
                <PhoneCall size={19} color="#06B6D4" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-sm">Command Hotlines & SOP</Text>
                <Text className="text-slate-400 text-[11px] mt-0.5">
                  Emergency coordination directory & protocols
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Secure Sign Out Button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-rose-950/40 border border-rose-900/60 py-4 px-5 rounded-3xl flex-row items-center justify-center shadow-lg active:bg-rose-950/70 mb-4"
          activeOpacity={0.8}
        >
          <LogOut size={18} color="#F43F5E" />
          <Text className="text-rose-400 font-extrabold text-sm ml-2.5 tracking-wide">
            SIGN OUT OF TERMINAL
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
