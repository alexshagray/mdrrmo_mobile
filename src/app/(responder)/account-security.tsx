import React, { useState, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Settings,
  Shield,
  ShieldCheck,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  User,
  Mail,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  BadgeCheck,
  Radio,
  Edit3,
  X,
  Check,
} from 'lucide-react-native';
import { useAuth } from '@/shared/hooks';
import { changeResponderPasswordApi, updateResponderPersonalApi } from '@/shared/api/residents';
import { resolveImageUrl } from '@/shared/utils/imageUrl';
import { Avatar } from '@/shared/components/Avatar';

export default function ResponderSettingsScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Password Feedback State
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Phone Edit Modal State
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState(user?.phone_number || '');
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  const [phoneSuccess, setPhoneSuccess] = useState('');

  // Refresh user data from API on screen load to ensure latest contact number is rendered
  useEffect(() => {
    refreshUser?.();
  }, []);

  useEffect(() => {
    if (user?.phone_number) {
      setPhoneInput(user.phone_number);
    }
  }, [user?.phone_number]);

  // Safe Navigation Back to Profile
  const handleBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(responder)/profile');
      }
    } catch {
      router.replace('/(responder)/profile');
    }
  };

  // Format Helpers
  const formatName = (str: string | undefined | null) => {
    if (!str) return 'Emergency Responder';
    return str
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const rawName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Emergency Responder'
    : 'Emergency Responder';
  const fullName = formatName(rawName);
  const roleName = user?.responder_profile?.position || 'Emergency Responder';
  const teamName = user?.responder_profile?.team || 'ALPHA';
  const badge = user?.badge_number || `MDRRMO-${user?.id?.toString().padStart(4, '0') || '0000'}`;
  const email = user?.email || 'responder@opol.gov.ph';
  const phone = user?.phone_number || user?.phone || 'No phone registered';
  const photoUrl = resolveImageUrl(user?.profile_photo_url);

  // Password Validation
  const isMinLength = newPassword.length >= 8;
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;

  // Change Password Action
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
    setPasswordError('');
    setPasswordSuccess('');
    setIsUpdatingPassword(true);

    try {
      const payload = {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      };

      const res = await changeResponderPasswordApi(payload);

      setPasswordSuccess(res?.message || 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setPasswordSuccess('');
      }, 5000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.current_password?.[0] ||
        err?.response?.data?.errors?.password?.[0] ||
        'Unable to update password. Please check your inputs.';
      setPasswordError(msg);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Update Phone Action
  const handleSavePhone = async () => {
    try {
      setIsUpdatingPhone(true);
      await updateResponderPersonalApi({ phone_number: phoneInput.trim() });
      await refreshUser?.();
      setShowPhoneModal(false);
      setPhoneSuccess('Contact phone number updated successfully.');
      setTimeout(() => setPhoneSuccess(''), 4000);
    } catch (err: any) {
      Alert.alert('Update Failed', err?.response?.data?.message || 'Could not update phone number.');
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-100">
      {/* Top Header Background Bar */}
      <View
        className="absolute top-0 left-0 right-0 h-[190px] bg-[#208AEF] rounded-b-[36px] overflow-hidden"
        pointerEvents="none"
      >
        <View className="absolute top-[-30px] left-[-30px] w-52 h-52 bg-[#3B9CF8] rounded-full opacity-40" />
        <View className="absolute top-[10%] right-[-50px] w-64 h-64 bg-[#1570C7] rounded-full opacity-40" />
      </View>

      <SafeAreaView className="flex-1" edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {/* Header Bar */}
          <View className="px-5 pt-2 pb-4 flex-row items-center justify-between">
            <TouchableOpacity
              onPress={handleBack}
              className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 items-center justify-center active:bg-white/30 shadow-sm"
              activeOpacity={0.7}
            >
              <ArrowLeft size={19} color="#FFFFFF" />
            </TouchableOpacity>

            <View className="items-center flex-1 mx-2">
              <View className="flex-row items-center">
                <Settings size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text className="text-white text-lg font-black tracking-tight">Settings</Text>
              </View>
              <Text className="text-blue-100 text-[11px] font-semibold tracking-wider uppercase mt-0.5">
                Privacy & Security Controls
              </Text>
            </View>

            <View className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 items-center justify-center">
              <ShieldCheck size={19} color="#FFFFFF" />
            </View>
          </View>

          {/* Scrollable Settings Content */}
          <ScrollView
            className="flex-1 px-4"
            contentContainerStyle={{ paddingTop: 10, paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Section Banner: PRIVACY */}
            <View className="flex-row items-center justify-between mb-3 px-1">
              <View className="flex-row items-center">
                <ShieldCheck size={16} color="#208AEF" style={{ marginRight: 6 }} />
                <Text className="text-slate-900 font-black text-xs uppercase tracking-wider">
                  Privacy
                </Text>
              </View>
              <View className="bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex-row items-center">
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                <Text className="text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                  Verified Identity
                </Text>
              </View>
            </View>

            {/* Notification Toast if phone updated */}
            {phoneSuccess ? (
              <View className="mb-3.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex-row items-center shadow-sm">
                <CheckCircle2 size={16} color="#059669" style={{ marginRight: 8 }} />
                <Text className="text-emerald-800 text-xs font-semibold flex-1">
                  {phoneSuccess}
                </Text>
              </View>
            ) : null}

            {/* ============================================================ */}
            {/* PART 1: PERSONAL INFORMATION CARD                            */}
            {/* ============================================================ */}
            <View
              className="bg-white rounded-3xl p-5 mb-5 border border-slate-200/80 shadow-md"
              style={{
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 3,
              }}
            >
              {/* Header */}
              <View className="flex-row items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/60 items-center justify-center mr-2.5">
                    <User size={16} color="#208AEF" />
                  </View>
                  <View>
                    <Text className="text-slate-900 font-extrabold text-sm tracking-tight">
                      Personal Information
                    </Text>
                    <Text className="text-slate-400 text-[10px]">Official MDRRMO Responder Identity</Text>
                  </View>
                </View>
                <View className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                  <Text className="text-slate-700 font-extrabold text-[10px] font-mono tracking-wider">
                    {badge}
                  </Text>
                </View>
              </View>

              {/* Profile Avatar & Name Block */}
              <View className="flex-row items-center mb-5">
                <Avatar
                  size="lg"
                  source={photoUrl ? { uri: photoUrl } : undefined}
                  name={fullName}
                />
                <View className="ml-4 flex-1">
                  <Text className="text-slate-900 font-black text-lg leading-tight">
                    {fullName}
                  </Text>
                  <View className="flex-row items-center flex-wrap gap-1.5 mt-1.5">
                    <View className="bg-rose-50 border border-rose-200/90 px-2.5 py-0.5 rounded-md">
                      <Text className="text-rose-700 font-bold text-[10px] uppercase tracking-wider">
                        {roleName}
                      </Text>
                    </View>
                    <View className="bg-blue-50 border border-blue-200/90 px-2.5 py-0.5 rounded-md">
                      <Text className="text-blue-700 font-bold text-[10px] uppercase tracking-wider">
                        TEAM {teamName}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Tabular Details */}
              <View className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                {/* Full Name */}
                <View className="pb-3 flex-row items-center justify-between border-b border-slate-200/60">
                  <View className="flex-row items-center">
                    <User size={14} color="#64748B" />
                    <Text className="text-slate-500 text-xs font-medium ml-2">Operator Name</Text>
                  </View>
                  <Text className="text-slate-900 text-xs font-bold">{fullName}</Text>
                </View>

                {/* Assigned Position */}
                <View className="py-3 flex-row items-center justify-between border-b border-slate-200/60">
                  <View className="flex-row items-center">
                    <Shield size={14} color="#64748B" />
                    <Text className="text-slate-500 text-xs font-medium ml-2">Assigned Position</Text>
                  </View>
                  <Text className="text-slate-900 text-xs font-bold uppercase">{roleName}</Text>
                </View>

                {/* Assigned Squad */}
                <View className="py-3 flex-row items-center justify-between border-b border-slate-200/60">
                  <View className="flex-row items-center">
                    <Radio size={14} color="#64748B" />
                    <Text className="text-slate-500 text-xs font-medium ml-2">Ambulance Unit</Text>
                  </View>
                  <Text className="text-slate-900 text-xs font-bold">Team {teamName}</Text>
                </View>

                {/* Email */}
                <View className="py-3 flex-row items-center justify-between border-b border-slate-200/60">
                  <View className="flex-row items-center flex-1 mr-2">
                    <Mail size={14} color="#64748B" />
                    <Text className="text-slate-500 text-xs font-medium ml-2">Official Email</Text>
                  </View>
                  <Text className="text-slate-800 text-xs font-semibold" numberOfLines={1}>
                    {email}
                  </Text>
                </View>

                {/* Contact Number with Edit Action */}
                <View className="pt-3 flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1 mr-2">
                    <Smartphone size={14} color="#64748B" />
                    <Text className="text-slate-500 text-xs font-medium ml-2">Contact Number</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text
                      className={`text-xs font-bold mr-2 ${
                        phone === 'No phone registered' ? 'text-slate-400 italic' : 'text-slate-900'
                      }`}
                    >
                      {phone}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setPhoneInput(user?.phone_number || '');
                        setShowPhoneModal(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/80 active:bg-blue-100 flex-row items-center"
                      activeOpacity={0.7}
                    >
                      <Edit3 size={11} color="#208AEF" style={{ marginRight: 3 }} />
                      <Text className="text-[#1A76CE] text-[10px] font-bold">Edit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* ============================================================ */}
            {/* PART 2: CHANGE PASSWORD CARD                                 */}
            {/* ============================================================ */}
            <View
              className="bg-white rounded-3xl p-5 mb-5 border border-slate-200/80 shadow-md"
              style={{
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 3,
              }}
            >
              {/* Card Title Block */}
              <View className="flex-row items-center mb-4 pb-3 border-b border-slate-100">
                <View className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 items-center justify-center mr-2.5">
                  <KeyRound size={16} color="#D97706" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-900 font-extrabold text-sm">Change Password</Text>
                  <Text className="text-slate-400 text-[10px]">Update terminal security password</Text>
                </View>
              </View>

              {/* Success Message Banner */}
              {passwordSuccess ? (
                <View className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex-row items-center">
                  <CheckCircle2 size={16} color="#059669" style={{ marginRight: 8 }} />
                  <Text className="text-emerald-700 text-xs font-semibold flex-1">
                    {passwordSuccess}
                  </Text>
                </View>
              ) : null}

              {/* Error Message Banner */}
              {passwordError ? (
                <View className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex-row items-center">
                  <AlertCircle size={16} color="#DC2626" style={{ marginRight: 8 }} />
                  <Text className="text-red-700 text-xs font-semibold flex-1">
                    {passwordError}
                  </Text>
                </View>
              ) : null}

              {/* Field 1: Current Password */}
              <View className="mb-3.5">
                <Text className="text-slate-700 text-xs font-bold mb-1.5 ml-1">Current Password</Text>
                <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 focus:border-[#208AEF]">
                  <Lock size={15} color="#64748B" style={{ marginRight: 10 }} />
                  <TextInput
                    className="flex-1 text-slate-900 text-xs font-semibold py-0"
                    placeholder="Enter current password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showCurrent}
                    value={currentPassword}
                    onChangeText={(val) => {
                      setCurrentPassword(val);
                      if (fieldErrors.currentPassword) {
                        setFieldErrors((prev) => ({ ...prev, currentPassword: '' }));
                      }
                    }}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} className="p-1">
                    {showCurrent ? <EyeOff size={16} color="#64748B" /> : <Eye size={16} color="#64748B" />}
                  </TouchableOpacity>
                </View>
                {fieldErrors.currentPassword ? (
                  <Text className="text-red-500 text-[11px] font-medium mt-1 ml-1">
                    {fieldErrors.currentPassword}
                  </Text>
                ) : null}
              </View>

              {/* Field 2: New Password */}
              <View className="mb-3.5">
                <Text className="text-slate-700 text-xs font-bold mb-1.5 ml-1">New Password</Text>
                <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 focus:border-[#208AEF]">
                  <Lock size={15} color="#64748B" style={{ marginRight: 10 }} />
                  <TextInput
                    className="flex-1 text-slate-900 text-xs font-semibold py-0"
                    placeholder="At least 8 characters"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showNew}
                    value={newPassword}
                    onChangeText={(val) => {
                      setNewPassword(val);
                      if (fieldErrors.newPassword) {
                        setFieldErrors((prev) => ({ ...prev, newPassword: '' }));
                      }
                    }}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowNew(!showNew)} className="p-1">
                    {showNew ? <EyeOff size={16} color="#64748B" /> : <Eye size={16} color="#64748B" />}
                  </TouchableOpacity>
                </View>
                {fieldErrors.newPassword ? (
                  <Text className="text-red-500 text-[11px] font-medium mt-1 ml-1">
                    {fieldErrors.newPassword}
                  </Text>
                ) : null}
              </View>

              {/* Field 3: Confirm New Password */}
              <View className="mb-4">
                <Text className="text-slate-700 text-xs font-bold mb-1.5 ml-1">Confirm New Password</Text>
                <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 focus:border-[#208AEF]">
                  <Lock size={15} color="#64748B" style={{ marginRight: 10 }} />
                  <TextInput
                    className="flex-1 text-slate-900 text-xs font-semibold py-0"
                    placeholder="Re-enter new password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showConfirm}
                    value={confirmPassword}
                    onChangeText={(val) => {
                      setConfirmPassword(val);
                      if (fieldErrors.confirmPassword) {
                        setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                      }
                    }}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} className="p-1">
                    {showConfirm ? <EyeOff size={16} color="#64748B" /> : <Eye size={16} color="#64748B" />}
                  </TouchableOpacity>
                </View>
                {fieldErrors.confirmPassword ? (
                  <Text className="text-red-500 text-[11px] font-medium mt-1 ml-1">
                    {fieldErrors.confirmPassword}
                  </Text>
                ) : null}
              </View>

              {/* Validation Rules Indicator */}
              <View className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 mb-5">
                <View className="flex-row items-center mb-1">
                  <View
                    className={`w-3.5 h-3.5 rounded-full items-center justify-center mr-2 ${
                      isMinLength ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <Check size={9} color="#FFFFFF" />
                  </View>
                  <Text className={`text-[11px] ${isMinLength ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    Minimum 8 characters length
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <View
                    className={`w-3.5 h-3.5 rounded-full items-center justify-center mr-2 ${
                      isMatching ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <Check size={9} color="#FFFFFF" />
                  </View>
                  <Text className={`text-[11px] ${isMatching ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    Passwords match identically
                  </Text>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleChangePassword}
                disabled={isUpdatingPassword}
                className={`py-3.5 rounded-2xl flex-row items-center justify-center shadow-sm ${
                  isUpdatingPassword ? 'bg-blue-400' : 'bg-[#208AEF] active:bg-[#1A76CE]'
                }`}
                activeOpacity={0.8}
              >
                {isUpdatingPassword ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <KeyRound size={15} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text className="text-white font-black text-xs uppercase tracking-wider">
                      Update Password
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Back Button Link at Bottom */}
            <TouchableOpacity
              onPress={handleBack}
              className="py-3 rounded-2xl bg-white border border-slate-200/80 items-center justify-center flex-row shadow-sm active:bg-slate-50"
              activeOpacity={0.8}
            >
              <ArrowLeft size={14} color="#64748B" style={{ marginRight: 6 }} />
              <Text className="text-slate-700 font-extrabold text-xs uppercase tracking-wider">
                Back to Profile
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Modal for Editing Phone Number */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={showPhoneModal}
            onRequestClose={() => !isUpdatingPhone && setShowPhoneModal(false)}
          >
            <View className="flex-1 justify-center items-center bg-slate-900/60 px-5">
              <View
                className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100"
                style={{
                  shadowColor: '#0F172A',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.15,
                  shadowRadius: 20,
                  elevation: 8,
                }}
              >
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center">
                    <View className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 items-center justify-center mr-2.5">
                      <Smartphone size={18} color="#208AEF" />
                    </View>
                    <Text className="text-slate-900 font-extrabold text-base">Edit Contact Number</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowPhoneModal(false)}
                    disabled={isUpdatingPhone}
                    className="p-1 rounded-full bg-slate-100"
                  >
                    <X size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <Text className="text-slate-500 text-xs mb-3">
                  Update the official telephone number where dispatchers and field crew can contact you.
                </Text>

                <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 mb-4">
                  <Smartphone size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                  <TextInput
                    className="flex-1 text-slate-900 text-xs font-bold py-0"
                    placeholder="e.g. 09171234567"
                    placeholderTextColor="#94A3B8"
                    value={phoneInput}
                    onChangeText={setPhoneInput}
                    keyboardType="phone-pad"
                    autoFocus={true}
                  />
                </View>

                <View className="flex-row items-center gap-2.5">
                  <TouchableOpacity
                    onPress={() => setShowPhoneModal(false)}
                    disabled={isUpdatingPhone}
                    className="flex-1 py-3 rounded-xl bg-slate-100 items-center"
                  >
                    <Text className="text-slate-700 font-bold text-xs">Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSavePhone}
                    disabled={isUpdatingPhone}
                    className="flex-1 py-3 rounded-xl bg-[#208AEF] items-center"
                  >
                    {isUpdatingPhone ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text className="text-white font-bold text-xs">Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
