import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Shield,
  LogOut,
  ChevronRight,
  Activity,
  History,
  Lock,
  PhoneCall,
  Mail,
  Smartphone,
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
  const roleName = user?.responder_profile?.position || 'Emergency Responder';
  const teamName = user?.responder_profile?.team || 'ALPHA';
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
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Top Header Label */}
      <View className="px-5 py-3.5 flex-row items-center justify-between border-b border-slate-200/60 bg-white">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200/60 items-center justify-center mr-2.5">
            <Shield size={16} color="#0F172A" />
          </View>
          <Text className="text-slate-900 font-bold text-base tracking-tight">
            Responder Profile
          </Text>
        </View>
        <View className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
          <Text className="text-slate-600 font-bold text-[10px] tracking-widest uppercase">
            TEAM {teamName}
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
                  className="bg-slate-900 text-white font-bold"
                />
              )}
            </View>
            {/* Online/Duty Status Indicator */}
            <View
              className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-white ${
                isOnDuty ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
          </View>

          {/* Full Name */}
          <Text className="text-2xl font-black text-slate-900 text-center tracking-tight mb-1">
            {fullName}
          </Text>

          {/* Role & Badge Pills */}
          <View className="flex-row items-center gap-2 mb-3.5">
            <View className="bg-rose-50 border border-rose-200/70 px-3 py-1 rounded-full">
              <Text className="text-rose-700 font-bold text-[11px] tracking-wider uppercase">
                {roleName}
              </Text>
            </View>
            <View className="bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
              <Text className="text-slate-600 font-mono font-bold text-[11px] tracking-wider">
                ID: {badge}
              </Text>
            </View>
          </View>

          {/* Email & Phone */}
          <View className="space-y-1.5 items-center pt-2 border-t border-slate-100 w-full">
            <View className="flex-row items-center">
              <Mail size={13} color="#94A3B8" style={{ marginRight: 6 }} />
              <Text className="text-slate-600 text-xs font-medium">{email}</Text>
            </View>

            <View className="flex-row items-center mt-1">
              <Smartphone size={13} color="#94A3B8" style={{ marginRight: 6 }} />
              <Text className="text-slate-500 text-xs font-medium">{phone}</Text>
            </View>
          </View>
        </View>

        {/* Shift Status Card */}
        <View
          className="bg-white border border-slate-200/80 rounded-3xl p-5 mb-5 flex-row justify-between items-center"
          style={{
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 14,
            elevation: 3,
          }}
        >
          <View className="flex-row items-center flex-1 mr-3">
            <View
              className={`w-11 h-11 rounded-2xl items-center justify-center mr-3.5 border ${
                isOnDuty
                  ? 'bg-emerald-50 border-emerald-200/70'
                  : 'bg-slate-50 border-slate-200/70'
              }`}
            >
              <Activity size={20} color={isOnDuty ? '#059669' : '#94A3B8'} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="font-bold text-slate-900 text-sm mr-2">Shift Status</Text>
                <View
                  className={`px-2 py-0.5 rounded-full border ${
                    isOnDuty
                      ? 'bg-emerald-50 border-emerald-200/70'
                      : 'bg-slate-100 border-slate-200/70'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold uppercase ${
                      isOnDuty ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    {isOnDuty ? 'ACTIVE' : 'OFF DUTY'}
                  </Text>
                </View>
              </View>
              <Text className="text-slate-400 text-xs mt-0.5 leading-snug">
                {isOnDuty
                  ? 'Ready to receive emergency missions'
                  : 'Standby mode / unavailable'}
              </Text>
            </View>
          </View>

          <Switch
            value={isOnDuty}
            onValueChange={toggleDutyStatus}
            trackColor={{ true: '#10B981', false: '#E2E8F0' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Qualifications Section */}
        <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2.5 ml-1">
          Responder Certifications
        </Text>

        <View
          className="bg-white border border-slate-200/80 rounded-3xl p-5 mb-5"
          style={{
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center mb-3">
            <View className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/60 items-center justify-center mr-3">
              <Shield size={18} color="#2563EB" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-slate-900 text-sm">Emergency Medical Technician</Text>
              <Text className="text-slate-400 text-xs mt-0.5">EMT-Basic Certified • DOH Accredited</Text>
            </View>
          </View>

          <View className="h-[1px] bg-slate-100 w-full mb-3" />

          <View className="flex-row items-center">
            <View className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/60 items-center justify-center mr-3">
              <Award size={18} color="#4F46E5" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-slate-900 text-sm">Basic Life Support (BLS)</Text>
              <Text className="text-slate-400 text-xs mt-0.5">CPR & Automated External Defibrillator (AED)</Text>
            </View>
          </View>
        </View>

        {/* Operations & Settings */}
        <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2.5 ml-1">
          Operations & System
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
          {/* Dispatch History */}
          <TouchableOpacity
            onPress={() => router.push('/(responder)/history')}
            className="flex-row items-center justify-between p-4 border-b border-slate-100 active:bg-slate-50"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 items-center justify-center mr-3">
                <History size={18} color="#D97706" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-900 font-bold text-sm">Dispatch History</Text>
                <Text className="text-slate-400 text-[11px] mt-0.5">
                  Completed emergency missions & logs
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Account & Security */}
          <TouchableOpacity
            onPress={() => router.push('/(responder)/account-security')}
            className="flex-row items-center justify-between p-4 border-b border-slate-100 active:bg-slate-50"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 items-center justify-center mr-3">
                <Lock size={18} color="#64748B" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-900 font-bold text-sm">Account & Security</Text>
                <Text className="text-slate-400 text-[11px] mt-0.5">
                  Update terminal access password
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Command Hotlines & SOP */}
          <TouchableOpacity
            onPress={() => router.push('/(responder)/help-support')}
            className="flex-row items-center justify-between p-4 active:bg-slate-50"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200/60 items-center justify-center mr-3">
                <PhoneCall size={18} color="#0891B2" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-900 font-bold text-sm">Command Hotlines & SOP</Text>
                <Text className="text-slate-400 text-[11px] mt-0.5">
                  Emergency coordination directory & protocols
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
            SIGN OUT OF TERMINAL
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
