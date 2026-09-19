import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Top Header Label */}
      <View className="px-5 py-3.5 flex-row items-center justify-between border-b border-slate-200/60 bg-white">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200/60 items-center justify-center mr-2.5">
            <Shield size={16} color="#0F172A" />
          </View>
          <Text className="text-slate-900 font-bold text-base tracking-tight">
            Resident Profile
          </Text>
        </View>
        <View className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
          <Text className="text-slate-600 font-bold text-[10px] tracking-widest uppercase">
            MDRRMO OPOL
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingVertical: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View
          className="bg-white border border-slate-200/80 rounded-3xl p-6 mb-5 items-center"
          style={{
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 14,
            elevation: 3,
          }}
        >
          {/* Profile Photo */}
          <View className="relative mb-3.5">
            <View className="w-24 h-24 rounded-full bg-slate-100 border-2 border-white shadow-md items-center justify-center overflow-hidden">
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
                  className="bg-indigo-600 text-white font-bold"
                />
              )}
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(resident)/personal-info')}
              className="absolute bottom-0 right-0 w-7 h-7 bg-slate-900 rounded-full border-2 border-white items-center justify-center shadow-sm"
              activeOpacity={0.8}
            >
              <Edit3 size={13} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Full Name */}
          <Text className="text-2xl font-black text-slate-900 text-center tracking-tight mb-1">
            {fullName}
          </Text>

          {/* Verified Resident Badge */}
          <View className="flex-row items-center bg-indigo-50 border border-indigo-200/70 px-3 py-1 rounded-full mb-3.5">
            <ShieldCheck size={12} color="#4F46E5" style={{ marginRight: 5 }} />
            <Text className="text-indigo-700 font-bold text-[11px] tracking-wider uppercase">
              VERIFIED RESIDENT
            </Text>
          </View>

          {/* Email & Phone */}
          <View className="space-y-1.5 items-center pt-2 border-t border-slate-100 w-full mb-4">
            <View className="flex-row items-center">
              <Mail size={13} color="#94A3B8" style={{ marginRight: 6 }} />
              <Text className="text-slate-600 text-xs font-medium">{email}</Text>
            </View>

            <View className="flex-row items-center mt-1">
              <Smartphone size={13} color="#94A3B8" style={{ marginRight: 6 }} />
              <Text className="text-slate-500 text-xs font-medium">{phone}</Text>
            </View>
          </View>

          {/* Edit Profile Button */}
          <TouchableOpacity
            onPress={() => router.push('/(resident)/personal-info')}
            className="w-full bg-slate-50 border border-slate-200/80 py-2.5 rounded-2xl flex-row items-center justify-center active:bg-slate-100"
            activeOpacity={0.7}
          >
            <Edit3 size={14} color="#475569" style={{ marginRight: 6 }} />
            <Text className="text-slate-700 font-bold text-xs">Edit Personal Details</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Identity & Emergency Records */}
        <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2.5 ml-1">
          Identity & Emergency Records
        </Text>

        <View
          className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden mb-5"
          style={{
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          {/* Personal Information */}
          <TouchableOpacity
            onPress={() => router.push('/(resident)/personal-info')}
            className="flex-row items-center justify-between p-4 border-b border-slate-100 active:bg-slate-50"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/60 items-center justify-center mr-3">
                <User size={18} color="#2563EB" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-900 font-bold text-sm">Personal Information</Text>
                <Text className="text-slate-400 text-[11px] mt-0.5" numberOfLines={1}>
                  Name, birthdate, gender, and home address
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Emergency Information */}
          <TouchableOpacity
            onPress={() => router.push('/(resident)/emergency-info')}
            className="flex-row items-center justify-between p-4 active:bg-slate-50"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200/60 items-center justify-center mr-3">
                <HeartPulse size={18} color="#E11D48" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-900 font-bold text-sm">Emergency Medical Data</Text>
                <Text className="text-slate-400 text-[11px] mt-0.5" numberOfLines={1}>
                  Emergency contacts, blood type, and medical conditions
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Section: Activity & Reports */}
        <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2.5 ml-1">
          Activity & Communications
        </Text>

        <View
          className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden mb-5"
          style={{
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          {/* My Emergency Reports */}
          <TouchableOpacity
            onPress={() => router.push('/(resident)/my-reports')}
            className="flex-row items-center justify-between p-4 border-b border-slate-100 active:bg-slate-50"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 items-center justify-center mr-3">
                <FileText size={18} color="#D97706" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-slate-900 font-bold text-sm">My Emergency Reports</Text>
                  {reportCount > 0 ? (
                    <View className="bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full ml-2">
                      <Text className="text-amber-800 text-[10px] font-bold">
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
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Notifications */}
          <TouchableOpacity
            onPress={() => router.push('/(resident)/notifications')}
            className="flex-row items-center justify-between p-4 active:bg-slate-50"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/60 items-center justify-center mr-3">
                <Bell size={18} color="#4F46E5" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-900 font-bold text-sm">Notifications & Alerts</Text>
                <Text className="text-slate-400 text-[11px] mt-0.5" numberOfLines={1}>
                  Verification updates & emergency advisories
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Section: Preferences & Help */}
        <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2.5 ml-1">
          Security & Directory
        </Text>

        <View
          className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden mb-6"
          style={{
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          {/* Location & Privacy */}
          <TouchableOpacity
            onPress={() => router.push('/(resident)/location-privacy')}
            className="flex-row items-center justify-between p-4 border-b border-slate-100 active:bg-slate-50"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/60 items-center justify-center mr-3">
                <MapPin size={18} color="#059669" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-900 font-bold text-sm">Location & Privacy</Text>
                <Text className="text-slate-400 text-[11px] mt-0.5" numberOfLines={1}>
                  GPS permissions and data safety policy
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Account & Security */}
          <TouchableOpacity
            onPress={() => router.push('/(resident)/account-security')}
            className="flex-row items-center justify-between p-4 border-b border-slate-100 active:bg-slate-50"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 items-center justify-center mr-3">
                <Lock size={18} color="#64748B" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-900 font-bold text-sm">Account & Security</Text>
                <Text className="text-slate-400 text-[11px] mt-0.5" numberOfLines={1}>
                  Change password & credentials
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Help & Support */}
          <TouchableOpacity
            onPress={() => router.push('/(resident)/help-support')}
            className="flex-row items-center justify-between p-4 active:bg-slate-50"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200/60 items-center justify-center mr-3">
                <PhoneCall size={18} color="#0891B2" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-900 font-bold text-sm">Help & Hotlines</Text>
                <Text className="text-slate-400 text-[11px] mt-0.5" numberOfLines={1}>
                  Emergency directory: Police, Fire, Health & FAQs
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-white border border-rose-200 py-3.5 px-5 rounded-2xl flex-row items-center justify-center active:bg-rose-50 mb-4"
          activeOpacity={0.8}
        >
          <LogOut size={17} color="#E11D48" />
          <Text className="text-rose-600 font-bold text-xs ml-2 tracking-wider">
            SIGN OUT
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
