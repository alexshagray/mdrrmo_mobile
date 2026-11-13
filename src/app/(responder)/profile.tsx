import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import {
  Shield,
  LogOut,
  ChevronRight,
  Activity,
  History,
  Lock,
  Settings,
  Mail,
  Smartphone,
  Award,
  User,
  Camera,
  Radio,
} from 'lucide-react-native';
import { useAuth } from '@/shared/hooks';
import { Avatar, PhotoSelectModal } from '@/shared/components';
import { uploadResponderPhotoApi, deleteResponderPhotoApi } from '@/shared/api/residents';
import { resolveImageUrl } from '@/shared/utils/imageUrl';

export default function ResponderProfileScreen() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    refreshUser?.();
  }, []);

  const formatName = (str: string | undefined | null) => {
    if (!str) return 'Emergency Responder';
    return str
      .trim()
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
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

  // Photo Upload & Delete Actions
  const handleUploadPhoto = async (uri: string) => {
    try {
      setIsUploadingPhoto(true);
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      const formData = new FormData();
      formData.append('photo', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type: type,
      } as any);

      await uploadResponderPhotoApi(formData);
      await refreshUser?.();
      Toast.show({
        type: 'success',
        text1: 'Photo Updated',
        text2: 'Your profile photo has been updated successfully.',
      });
    } catch (err: any) {
      console.error('Photo upload error:', err);
      Alert.alert('Upload Failed', err?.response?.data?.message || 'Could not update profile photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to take a profile photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        await handleUploadPhoto(result.assets[0].uri);
      }
    } catch (e) {
      console.error('Camera error:', e);
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery permission is required to choose a profile photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        await handleUploadPhoto(result.assets[0].uri);
      }
    } catch (e) {
      console.error('Gallery picker error:', e);
    }
  };

  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const handleRemovePhoto = async () => {
    try {
      setIsUploadingPhoto(true);
      await deleteResponderPhotoApi();
      await refreshUser?.();
      Toast.show({
        type: 'success',
        text1: 'Photo Removed',
        text2: 'Your profile photo has been removed.',
      });
    } catch (e: any) {
      Alert.alert('Error', 'Failed to remove profile photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePhotoAction = () => {
    setShowPhotoModal(true);
  };

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutModal(false);
      router.replace('/login');
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Background Elements (Same as Log in form) */}
      <View className="absolute top-0 left-0 right-0 h-[60%] bg-[#208AEF] rounded-b-[60px] overflow-hidden" pointerEvents="none">
        <View className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-[#3B9CF8] rounded-full opacity-40" />
        <View className="absolute top-[20%] right-[-80px] w-80 h-80 bg-[#1570C7] rounded-full opacity-40" />
        <View className="absolute bottom-[-30px] left-[10%] w-40 h-40 bg-[#70B9FA] rounded-full opacity-30" />
      </View>

      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Top Header Label */}
        <View className="px-5 py-3.5 flex-row items-center justify-between mb-1">
          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-xl bg-white/20 border border-white/30 items-center justify-center mr-2.5">
              <Shield size={16} color="#FFFFFF" />
            </View>
            <Text className="text-white font-bold text-base tracking-tight">
              Responder Profile
            </Text>
          </View>
          <View className="bg-white/20 border border-white/30 px-2.5 py-1 rounded-full">
            <Text className="text-white font-bold text-[10px] tracking-widest uppercase">
              TEAM {teamName}
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingVertical: 14, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
          <View
            className="bg-white border border-white/80 rounded-3xl p-6 mb-5 items-center shadow-xl shadow-blue-900/10"
            style={{
              elevation: 4,
            }}
          >
            {/* Profile Photo with Click-to-Change */}
            <View className="relative mb-3.5">
            <TouchableOpacity
              onPress={handlePhotoAction}
              activeOpacity={0.85}
              className="w-24 h-24 rounded-full bg-slate-100 border-2 border-white shadow-md items-center justify-center overflow-hidden"
            >
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
                  className="bg-[#208AEF] text-white font-bold"
                />
              )}

              {/* Uploading Spinner */}
              {isUploadingPhoto && (
                <View className="absolute inset-0 bg-black/50 items-center justify-center">
                  <ActivityIndicator color="#FFFFFF" size="small" />
                </View>
              )}
            </TouchableOpacity>

            {/* Online Status Indicator */}
            <View className="absolute top-0 right-0 w-5 h-5 rounded-full border-2 border-white bg-emerald-500" />

            {/* Camera / Edit Badge */}
            <TouchableOpacity
              onPress={handlePhotoAction}
              activeOpacity={0.8}
              className="absolute bottom-0 right-0 w-7 h-7 bg-slate-900 rounded-full border-2 border-white items-center justify-center shadow-sm"
            >
              <Camera size={13} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Full Name */}
          <Text className="text-2xl font-black text-slate-900 text-center tracking-tight mb-1">
            {fullName}
          </Text>

          {/* Role & Badge Pills */}
          <View className="flex-row items-center gap-2 mb-3.5">
            <View className="bg-red-50 border border-red-200/70 px-3 py-1 rounded-full">
              <Text className="text-[#FF3B30] font-bold text-[11px] tracking-wider uppercase">
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
            onPress={() => router.navigate('/(responder)/history')}
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

          {/* Settings */}
          <TouchableOpacity
            onPress={() => router.navigate('/(responder)/account-security')}
            className="flex-row items-center justify-between p-4 active:bg-slate-50"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/60 items-center justify-center mr-3">
                <Settings size={18} color="#208AEF" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-900 font-bold text-sm">Settings</Text>
                <Text className="text-slate-400 text-[11px] mt-0.5">
                  Privacy, personal info & security
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-white border border-red-200/80 py-3.5 px-5 rounded-2xl flex-row items-center justify-center active:bg-red-50 mb-4"
          activeOpacity={0.8}
        >
          <LogOut size={17} color="#FF3B30" />
          <Text className="text-[#FF3B30] font-bold text-xs ml-2 tracking-wider">
            SIGN OUT
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Log Out Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showLogoutModal}
        onRequestClose={() => !isLoggingOut && setShowLogoutModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => !isLoggingOut && setShowLogoutModal(false)}
          className="flex-1 justify-center items-center bg-slate-900/60 px-5"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-[340px] bg-white rounded-[28px] p-6 items-center shadow-2xl border border-slate-100"
            style={{
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.15,
              shadowRadius: 24,
              elevation: 8,
            }}
          >
            {/* Logout Icon Badge */}
            <View className="w-16 h-16 rounded-full bg-red-50 border border-red-100/80 items-center justify-center mb-3.5 shadow-sm shadow-red-100">
              <View className="w-12 h-12 rounded-full bg-red-500/10 items-center justify-center">
                <LogOut size={24} color="#DC2626" strokeWidth={2.4} />
              </View>
            </View>

            {/* Title */}
            <Text className="text-xl font-bold text-slate-900 text-center tracking-tight mb-2">
              Log Out
            </Text>

            {/* Message */}
            <Text className="text-slate-500 text-sm text-center font-normal leading-5 mb-6 px-2">
              Are you sure you want to log out?
            </Text>

            {/* Action Buttons */}
            <View className="w-full">
              <TouchableOpacity
                onPress={handleLogoutConfirm}
                disabled={isLoggingOut}
                activeOpacity={0.85}
                className="w-full h-12 bg-red-600 active:bg-red-700 rounded-2xl items-center flex-row justify-center shadow-md shadow-red-600/25"
              >
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <LogOut size={16} color="#FFFFFF" strokeWidth={2.2} style={{ marginRight: 8 }} />
                    <Text className="text-white font-bold text-sm tracking-wide">
                      Yes, Log Out
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                activeOpacity={0.7}
                className="w-full h-12 bg-slate-100 active:bg-slate-200 rounded-2xl items-center justify-center mt-2.5 border border-slate-200/70"
              >
                <Text className="text-slate-700 font-semibold text-sm">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Professional Profile Photo Selection Modal */}
      <PhotoSelectModal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onTakePhoto={takePhoto}
        onChooseFromGallery={pickFromGallery}
        onRemovePhoto={handleRemovePhoto}
        hasExistingPhoto={Boolean(photoUrl)}
        isLoading={isUploadingPhoto}
      />
      </SafeAreaView>
    </View>
  );
}
