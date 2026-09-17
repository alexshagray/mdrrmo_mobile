import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  User,
  HeartPulse,
  FileText,
  Bell,
  MapPin,
  Lock,
  PhoneCall,
  LogOut,
  ChevronRight,
  Shield,
  Edit3,
  Camera,
  Mail,
  Smartphone,
  ShieldCheck,
} from 'lucide-react-native';
import { useAuth } from '@/shared/hooks';
import { Avatar } from '@/shared/components';
import { getResidentProfileApi } from '@/shared/api/residents';
import { getMyReports } from '@/shared/api/incidents';

export default function ResidentProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [profileData, setProfileData] = useState<any>(null);
  const [reportCount, setReportCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const [res, repRes] = await Promise.allSettled([
        getResidentProfileApi(),
        getMyReports(),
      ]);

      if (res.status === 'fulfilled') {
        setProfileData(res.value);
      }
      if (repRes.status === 'fulfilled') {
        const list = repRes.value.data || repRes.value.incidents || (Array.isArray(repRes.value) ? repRes.value : []);
        setReportCount(list.length);
      }
    } catch (e) {
      console.error('Failed to load resident profile data:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const currentUser = profileData?.user || user;
  const fullName = currentUser
    ? `${currentUser.first_name || ''} ${currentUser.middle_name ? currentUser.middle_name + ' ' : ''}${currentUser.last_name || ''}`.trim() || 'Resident Citizen'
    : 'Resident Citizen';
  const email = currentUser?.email || 'resident@example.com';
  const phone = currentUser?.phone_number || currentUser?.phone || 'No phone registered';
  const photoUrl = currentUser?.profile_photo_url;

  const handleLogout = () => {
    Alert.alert(
      'Sign Out Confirmation',
      'Are you sure you want to sign out from your MDRRMO account?',
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
          <View className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 items-center justify-center mr-2.5">
            <Shield size={16} color="#3B82F6" />
          </View>
          <Text className="text-white font-extrabold text-sm tracking-widest uppercase">
            PROFILE
          </Text>
        </View>
        <View className="bg-blue-500/10 border border-blue-500/30 px-2.5 py-1 rounded-full">
          <Text className="text-blue-400 font-extrabold text-[10px] tracking-wider uppercase">
            MDRRMO OPOL
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingVertical: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header (Section 2 Requirement) */}
        <View className="bg-[#0F172A]/90 border border-slate-800 rounded-3xl p-6 mb-6 shadow-xl items-center relative overflow-hidden">
          {/* Subtle emergency background glow */}
          <View className="absolute top-0 right-0 w-36 h-36 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

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
                  className="bg-transparent text-blue-400 font-bold"
                />
              )}
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(resident)/personal-info')}
              className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full border-2 border-[#0F172A] items-center justify-center shadow-md active:bg-blue-700"
              activeOpacity={0.8}
            >
              <Edit3 size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Full Name */}
          <Text className="text-2xl font-black text-white text-center tracking-tight mb-1.5">
            {fullName}
          </Text>

          {/* Role Label */}
          <View className="flex-row items-center bg-blue-950/70 border border-blue-700/60 px-3.5 py-1 rounded-full mb-3 shadow-sm">
            <ShieldCheck size={13} color="#60A5FA" className="mr-1.5" />
            <Text className="text-blue-300 font-extrabold text-[11px] tracking-widest uppercase">
              RESIDENT
            </Text>
          </View>

          {/* Email & Phone */}
          <View className="space-y-1.5 items-center mb-5">
            <View className="flex-row items-center">
              <Mail size={13} color="#64748B" className="mr-1.5" />
              <Text className="text-slate-300 text-xs font-medium">{email}</Text>
            </View>

            <View className="flex-row items-center">
              <Smartphone size={13} color="#64748B" className="mr-1.5" />
              <Text className="text-slate-400 text-xs font-medium">{phone}</Text>
            </View>
          </View>

          {/* Edit Profile Button */}
          <TouchableOpacity
            onPress={() => router.push('/(resident)/personal-info')}
            className="w-full bg-slate-800/90 border border-slate-700/80 py-3 rounded-2xl flex-row items-center justify-center shadow-sm active:bg-slate-750"
            activeOpacity={0.7}
          >
            <Edit3 size={15} color="#94A3B8" className="mr-2" />
            <Text className="text-white font-bold text-xs">Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Personal & Emergency Navigation Cards */}
        <Text className="text-slate-400 font-extrabold text-xs uppercase tracking-wider mb-2.5 ml-1">
          Identity & Emergency Records
        </Text>

        <View className="bg-[#0F172A]/80 border border-slate-800 rounded-3xl overflow-hidden mb-6 shadow-lg">
          {/* Personal Information */}
          <TouchableOpacity
            onPress={() => router.push('/(resident)/personal-info')}
            className="flex-row items-center justify-between p-4.5 border-b border-slate-800/80 active:bg-slate-850"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 items-center justify-center mr-3.5">
                <User size={19} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-sm">Personal Information</Text>
                <Text className="text-slate-400 text-[11px] mt-0.5" numberOfLines={1}>
                  Name, birthdate, gender, and home address
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#64748B" />
          </TouchableOpacity>

          {/* Emergency Information */}
          <TouchableOpacity
            onPress={() => router.push('/(resident)/emergency-info')}
            className="flex-row items-center justify-between p-4.5 active:bg-slate-850"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 items-center justify-center mr-3.5">
                <HeartPulse size={19} color="#F43F5E" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-sm">Emergency Information</Text>
                <Text className="text-slate-400 text-[11px] mt-0.5" numberOfLines={1}>
                  Emergency contacts, blood type, and allergies
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Section: Activity & Reports Navigation Cards */}
        <Text className="text-slate-400 font-extrabold text-xs uppercase tracking-wider mb-2.5 ml-1">
          Activity & Communications
        </Text>

        <View className="bg-[#0F172A]/80 border border-slate-800 rounded-3xl overflow-hidden mb-6 shadow-lg">
          {/* My Emergency Reports */}
          <TouchableOpacity
            onPress={() => router.push('/(resident)/my-reports')}
            className="flex-row items-center justify-between p-4.5 border-b border-slate-800/80 active:bg-slate-850"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 items-center justify-center mr-3.5">
                <FileText size={19} color="#F59E0B" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-white font-bold text-sm">My Emergency Reports</Text>
                  {reportCount > 0 ? (
                    <View className="bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full ml-2">
                      <Text className="text-amber-400 text-[10px] font-extrabold">
                        {reportCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text className="text-slate-400 text-[11px] mt-0.5" numberOfLines={1}>
                  Submitted incidents, timeline & status
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#64748B" />
          </TouchableOpacity>

          {/* Notifications */}
          <TouchableOpacity
            onPress={() => router.push('/(resident)/notifications')}
            className="flex-row items-center justify-between p-4.5 active:bg-slate-850"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 items-center justify-center mr-3.5">
                <Bell size={19} color="#818CF8" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-sm">Notifications & Alerts</Text>
                <Text className="text-slate-400 text-[11px] mt-0.5" numberOfLines={1}>
                  Verification updates & emergency advisories
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Section: Security & Preferences Navigation Cards */}
        <Text className="text-slate-400 font-extrabold text-xs uppercase tracking-wider mb-2.5 ml-1">
          Preferences & Help
        </Text>

        <View className="bg-[#0F172A]/80 border border-slate-800 rounded-3xl overflow-hidden mb-6 shadow-lg">
          {/* Location & Privacy */}
          <TouchableOpacity
            onPress={() => router.push('/(resident)/location-privacy')}
            className="flex-row items-center justify-between p-4.5 border-b border-slate-800/80 active:bg-slate-850"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 items-center justify-center mr-3.5">
                <MapPin size={19} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-sm">Location & Privacy</Text>
                <Text className="text-slate-400 text-[11px] mt-0.5" numberOfLines={1}>
                  GPS permissions and data safety policy
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#64748B" />
          </TouchableOpacity>

          {/* Account & Security */}
          <TouchableOpacity
            onPress={() => router.push('/(resident)/account-security')}
            className="flex-row items-center justify-between p-4.5 border-b border-slate-800/80 active:bg-slate-850"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 items-center justify-center mr-3.5">
                <Lock size={19} color="#94A3B8" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-sm">Account & Security</Text>
                <Text className="text-slate-400 text-[11px] mt-0.5" numberOfLines={1}>
                  Change password & credentials
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#64748B" />
          </TouchableOpacity>

          {/* Help & Support */}
          <TouchableOpacity
            onPress={() => router.push('/(resident)/help-support')}
            className="flex-row items-center justify-between p-4.5 active:bg-slate-850"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 items-center justify-center mr-3.5">
                <PhoneCall size={19} color="#06B6D4" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-sm">Help & Hotlines</Text>
                <Text className="text-slate-400 text-[11px] mt-0.5" numberOfLines={1}>
                  Emergency directory: Police, Fire, Health & FAQs
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
            SIGN OUT
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
