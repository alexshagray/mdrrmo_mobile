import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  LogOut,
  Mail,
  Smartphone,
} from 'lucide-react-native';
import { useAuth } from '@/shared/hooks';
import { changeResidentPasswordApi, changeResponderPasswordApi } from '@/shared/api/residents';

export default function AccountSecurityScreen() {
  const router = useRouter();
  const { user, role, logout } = useAuth();

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // UI Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isMinLength = newPassword.length >= 8;
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;

  const handleChangePassword = async () => {
    const errs: Record<string, string> = {};

    if (!currentPassword) {
      errs.currentPassword = 'Enter your current password';
    }

    if (!newPassword) {
      errs.newPassword = 'Enter a new password';
    } else if (newPassword.length < 8) {
      errs.newPassword = 'Password must be at least 8 characters';
    }

    if (newPassword !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setFieldErrors({});
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const payload = {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      };

      let res;
      if (role === 'responder') {
        res = await changeResponderPasswordApi(payload);
      } else {
        res = await changeResidentPasswordApi(payload);
      }

      setSuccessMessage(res.message || 'Your password has been changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.current_password?.[0] ||
        err?.response?.data?.errors?.password?.[0] ||
        'Unable to update password. Please check your inputs.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirm Sign Out',
      'Are you sure you want to sign out of your MDRRMO account?',
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
    <SafeAreaView className="flex-1 bg-[#0B1120]" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Top App Bar */}
        <View className="flex-row items-center justify-between px-5 py-3 border-b border-slate-800/80 bg-[#0F172A]/90">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-xl bg-slate-800 items-center justify-center border border-slate-700 active:bg-slate-700"
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#F8FAFC" />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-white text-base font-bold tracking-tight">Account & Security</Text>
            <Text className="text-slate-400 text-xs">Credentials & Authentication</Text>
          </View>
          <View className="w-10" />
        </View>

        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingVertical: 20, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Account Overview Card */}
          <View className="bg-[#0F172A]/80 border border-slate-800 rounded-3xl p-5 mb-5 shadow-lg">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 items-center justify-center mr-3">
                  <ShieldCheck size={20} color="#3B82F6" />
                </View>
                <View>
                  <Text className="text-white font-bold text-base">Account Identity</Text>
                  <Text className="text-slate-400 text-xs">Verified system profile</Text>
                </View>
              </View>
              <View className="bg-emerald-950/60 border border-emerald-700/50 px-3 py-1 rounded-full">
                <Text className="text-emerald-400 text-[10px] font-extrabold uppercase">
                  ACTIVE
                </Text>
              </View>
            </View>

            <View className="space-y-2.5">
              <View className="flex-row items-center justify-between py-2 border-b border-slate-800/70">
                <View className="flex-row items-center">
                  <Mail size={14} color="#64748B" />
                  <Text className="text-slate-400 text-xs ml-2">Email Address</Text>
                </View>
                <Text className="text-white text-xs font-semibold">{user?.email || '—'}</Text>
              </View>

              <View className="flex-row items-center justify-between py-2 border-b border-slate-800/70">
                <View className="flex-row items-center">
                  <Smartphone size={14} color="#64748B" />
                  <Text className="text-slate-400 text-xs ml-2">Mobile Number</Text>
                </View>
                <Text className="text-white text-xs font-semibold">
                  {user?.phone_number || user?.phone || '—'}
                </Text>
              </View>

              <View className="flex-row items-center justify-between py-2">
                <Text className="text-slate-400 text-xs">Role</Text>
                <Text className="text-blue-400 font-extrabold text-xs uppercase tracking-wider">
                  {role === 'responder' ? 'EMERGENCY RESPONDER' : 'RESIDENT'}
                </Text>
              </View>
            </View>
          </View>

          {/* Change Password Card */}
          <View className="bg-[#0F172A]/80 border border-slate-800 rounded-3xl p-5 mb-5 shadow-lg">
            <View className="flex-row items-center mb-4">
              <View className="w-9 h-9 rounded-xl bg-amber-500/10 items-center justify-center border border-amber-500/20 mr-3">
                <KeyRound size={18} color="#F59E0B" />
              </View>
              <View>
                <Text className="text-white font-bold text-base">Change Password</Text>
                <Text className="text-slate-400 text-xs">Update your secure access key</Text>
              </View>
            </View>

            {/* Feedback Banners */}
            {successMessage ? (
              <View className="flex-row items-center bg-emerald-950/60 border border-emerald-700/50 rounded-2xl p-4 mb-4">
                <CheckCircle2 size={18} color="#10B981" />
                <Text className="text-emerald-300 text-xs font-semibold ml-2.5 flex-1">
                  {successMessage}
                </Text>
              </View>
            ) : null}

            {errorMessage ? (
              <View className="flex-row items-center bg-red-950/60 border border-red-700/50 rounded-2xl p-4 mb-4">
                <AlertCircle size={18} color="#EF4444" />
                <Text className="text-red-300 text-xs font-semibold ml-2.5 flex-1">
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {/* Current Password */}
            <View className="mb-3.5">
              <Text className="text-slate-300 text-xs font-semibold mb-1.5 ml-1">
                Current Password <Text className="text-rose-400">*</Text>
              </Text>
              <View className="relative flex-row items-center">
                <TextInput
                  value={currentPassword}
                  onChangeText={(val) => {
                    setCurrentPassword(val);
                    if (fieldErrors.currentPassword)
                      setFieldErrors((prev) => ({ ...prev, currentPassword: '' }));
                  }}
                  placeholder="Enter current password"
                  placeholderTextColor="#475569"
                  secureTextEntry={!showCurrent}
                  className={`bg-slate-900 border rounded-2xl px-4 py-3 text-white text-sm flex-1 pr-11 ${
                    fieldErrors.currentPassword
                      ? 'border-rose-500'
                      : 'border-slate-800 focus:border-blue-500'
                  }`}
                />
                <TouchableOpacity
                  onPress={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3.5 p-1"
                >
                  {showCurrent ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
                </TouchableOpacity>
              </View>
              {fieldErrors.currentPassword && (
                <Text className="text-rose-400 text-xs mt-1 ml-1">
                  {fieldErrors.currentPassword}
                </Text>
              )}
            </View>

            {/* New Password */}
            <View className="mb-3.5">
              <Text className="text-slate-300 text-xs font-semibold mb-1.5 ml-1">
                New Password <Text className="text-rose-400">*</Text>
              </Text>
              <View className="relative flex-row items-center">
                <TextInput
                  value={newPassword}
                  onChangeText={(val) => {
                    setNewPassword(val);
                    if (fieldErrors.newPassword)
                      setFieldErrors((prev) => ({ ...prev, newPassword: '' }));
                  }}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#475569"
                  secureTextEntry={!showNew}
                  className={`bg-slate-900 border rounded-2xl px-4 py-3 text-white text-sm flex-1 pr-11 ${
                    fieldErrors.newPassword
                      ? 'border-rose-500'
                      : 'border-slate-800 focus:border-blue-500'
                  }`}
                />
                <TouchableOpacity
                  onPress={() => setShowNew(!showNew)}
                  className="absolute right-3.5 p-1"
                >
                  {showNew ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
                </TouchableOpacity>
              </View>
              {fieldErrors.newPassword && (
                <Text className="text-rose-400 text-xs mt-1 ml-1">{fieldErrors.newPassword}</Text>
              )}
            </View>

            {/* Confirm New Password */}
            <View className="mb-4">
              <Text className="text-slate-300 text-xs font-semibold mb-1.5 ml-1">
                Confirm New Password <Text className="text-rose-400">*</Text>
              </Text>
              <View className="relative flex-row items-center">
                <TextInput
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (fieldErrors.confirmPassword)
                      setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }}
                  placeholder="Repeat new password"
                  placeholderTextColor="#475569"
                  secureTextEntry={!showConfirm}
                  className={`bg-slate-900 border rounded-2xl px-4 py-3 text-white text-sm flex-1 pr-11 ${
                    fieldErrors.confirmPassword
                      ? 'border-rose-500'
                      : 'border-slate-800 focus:border-blue-500'
                  }`}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 p-1"
                >
                  {showConfirm ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
                </TouchableOpacity>
              </View>
              {fieldErrors.confirmPassword && (
                <Text className="text-rose-400 text-xs mt-1 ml-1">
                  {fieldErrors.confirmPassword}
                </Text>
              )}
            </View>

            {/* Password Validation Checklist */}
            <View className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 mb-5 space-y-2">
              <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Password Requirements
              </Text>
              <View className="flex-row items-center">
                <View
                  className={`w-3.5 h-3.5 rounded-full items-center justify-center mr-2 ${
                    isMinLength ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                >
                  <Text className="text-white text-[9px] font-bold">✓</Text>
                </View>
                <Text
                  className={`text-xs ${
                    isMinLength ? 'text-emerald-400 font-semibold' : 'text-slate-500'
                  }`}
                >
                  Minimum 8 characters
                </Text>
              </View>
              <View className="flex-row items-center">
                <View
                  className={`w-3.5 h-3.5 rounded-full items-center justify-center mr-2 ${
                    isMatching ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                >
                  <Text className="text-white text-[9px] font-bold">✓</Text>
                </View>
                <Text
                  className={`text-xs ${
                    isMatching ? 'text-emerald-400 font-semibold' : 'text-slate-500'
                  }`}
                >
                  Passwords match
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleChangePassword}
              disabled={isLoading || !isMinLength || !isMatching}
              className={`py-4 rounded-2xl flex-row items-center justify-center ${
                !isMinLength || !isMatching
                  ? 'bg-blue-600/40 opacity-60'
                  : 'bg-blue-600 shadow-lg shadow-blue-600/30 active:bg-blue-700'
              }`}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Lock size={16} color="#FFFFFF" />
                  <Text className="text-white font-bold text-sm ml-2">Change Password</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Secure Logout Section */}
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-rose-950/40 border border-rose-800/50 py-4 px-5 rounded-3xl flex-row items-center justify-center active:bg-rose-950/70 shadow-lg"
            activeOpacity={0.8}
          >
            <LogOut size={18} color="#F43F5E" />
            <Text className="text-rose-400 font-bold text-sm ml-2.5">Sign Out of Account</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
