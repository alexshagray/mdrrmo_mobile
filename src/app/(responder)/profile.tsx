import React, { useState } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header, Avatar, Button } from '@/shared/components';
import { Settings, Shield, Bell, LogOut, ChevronRight, Activity, Camera } from 'lucide-react-native';
import { useAuth } from '@/shared/hooks';
// import * as ImagePicker from 'expo-image-picker';
import apiClient from '@/shared/api/client';

export default function ProfileScreen() {
  const { user, logout, isOnDuty, toggleDutyStatus } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [localPhotoUrl, setLocalPhotoUrl] = useState(null);

  const handleAccountSettings = () => {
    Alert.alert(
      "Account Settings",
      "Account configuration is currently locked by the administrator. Please contact your dispatch supervisor for changes."
    );
  };

  const handlePickImage = async () => {
    Alert.alert('Coming Soon', 'Profile picture uploads require a native app update which will be available soon.');
    /*
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to change your photo.');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const photo = result.assets[0];
        uploadPhoto(photo);
      }
    } catch (e) {
      console.log('Image picker error:', e);
    }
    */
  };

  const uploadPhoto = async (photo: any) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', {
        uri: photo.uri,
        name: 'profile.jpg',
        type: 'image/jpeg',
      } as any);

      const response = await apiClient.post('/responder/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data?.photo_url) {
        setLocalPhotoUrl(response.data.photo_url);
        Alert.alert('Success', 'Profile picture updated successfully!');
        // Note: Realistically, you'd want to update the AuthContext user object here too.
      }
    } catch (error) {
      console.log('Upload error:', error);
      Alert.alert('Upload Failed', 'There was a problem uploading your photo.');
    } finally {
      setIsUploading(false);
    }
  };

  const fullName = user ? `${user.first_name} ${user.last_name}` : 'Unknown Responder';
  const roleName = user?.role === 'responder' ? 'Emergency Responder' : (user?.role || 'Responder');
  const badge = user?.badge_number || `MDRRMO-${user?.id?.toString().padStart(4, '0') || '0000'}`;

  return (
    <View className="flex-1 bg-slate-100">
      <SafeAreaView className="flex-1" edges={['top']}>
        <Header title="Responder Profile" className="bg-slate-100 border-b-0" />
        
        <ScrollView className="flex-1 px-5 pt-2" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          
          {/* Premium Profile Header */}
          <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-6 items-center mt-2">
            <TouchableOpacity onPress={handlePickImage} className="relative mb-4">
              <View className="w-24 h-24 bg-blue-50 rounded-full border-4 border-blue-100 items-center justify-center shadow-sm overflow-hidden">
                <Avatar 
                   name={fullName} 
                   size="xl" 
                   source={localPhotoUrl || user?.profile_photo_url} 
                   className="bg-transparent text-blue-600" 
                />
              </View>
              <View className="absolute bottom-0 right-0 bg-blue-600 w-8 h-8 rounded-full border-2 border-white items-center justify-center shadow-sm">
                {isUploading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Camera size={14} color="#ffffff" />
                )}
              </View>
            </TouchableOpacity>
            
            <Text className="text-2xl font-black text-slate-800 tracking-tight">{fullName}</Text>
            <View className="flex-row items-center mt-2">
              <View className="bg-blue-100 px-3 py-1 rounded-full mr-2">
                <Text className="text-blue-700 font-bold text-xs uppercase tracking-widest">{roleName}</Text>
              </View>
              <Text className="text-slate-500 font-bold text-sm tracking-widest">ID: {badge}</Text>
            </View>
          </View>

          {/* Shift Status Card */}
          <View className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 mb-6 flex-row justify-between items-center">
            <View className="flex-row items-center flex-1">
              <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${isOnDuty ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                <Activity size={24} color={isOnDuty ? '#10B981' : '#94A3B8'} />
              </View>
              <View>
                <Text className="font-black text-slate-800 text-lg">Shift Status</Text>
                <Text className="text-slate-500 text-xs font-medium mt-0.5">{isOnDuty ? 'Active & Available for Dispatch' : 'Off-Duty / Unavailable'}</Text>
              </View>
            </View>
            <Switch 
              value={isOnDuty} 
              onValueChange={toggleDutyStatus}
              trackColor={{ true: '#10B981', false: '#CBD5E1' }} 
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Qualifications Section */}
          <Text className="text-slate-800 font-bold text-lg mb-3 ml-2 tracking-tight">Qualifications</Text>
          <View className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 mb-6">
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-4">
                <Shield size={20} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-slate-800">Emergency Medical Technician</Text>
                <Text className="text-slate-400 text-xs font-medium mt-0.5">EMT-Basic Certified</Text>
              </View>
            </View>
            
            <View className="h-[1px] bg-slate-100 w-full mb-4" />
            
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-indigo-50 items-center justify-center mr-4">
                <Shield size={20} color="#6366F1" />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-slate-800">Basic Life Support (BLS)</Text>
                <Text className="text-slate-400 text-xs font-medium mt-0.5">CPR & AED Certified</Text>
              </View>
            </View>
          </View>

          {/* Settings Section */}
          <Text className="text-slate-800 font-bold text-lg mb-3 ml-2 tracking-tight">Preferences</Text>
          <View className="bg-white rounded-3xl shadow-sm border border-slate-200 mb-8 overflow-hidden">
            
            <TouchableOpacity onPress={handleAccountSettings} className="flex-row items-center justify-between p-5 bg-white border-b border-slate-100 active:bg-slate-50">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mr-4">
                  <Settings size={20} color="#64748B" />
                </View>
                <Text className="font-bold text-slate-700 text-base">Account Settings</Text>
              </View>
              <ChevronRight size={20} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center justify-between p-5 bg-white active:bg-slate-50">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mr-4">
                  <Bell size={20} color="#64748B" />
                </View>
                <Text className="font-bold text-slate-700 text-base">Push Notifications</Text>
              </View>
              <ChevronRight size={20} color="#CBD5E1" />
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity 
            onPress={logout}
            className="bg-red-50 py-4 rounded-2xl flex-row items-center justify-center border border-red-200 shadow-sm"
          >
            <LogOut size={20} color="#EF4444" className="mr-2" />
            <Text className="text-red-500 font-bold tracking-widest text-sm">SECURE LOGOUT</Text>
          </TouchableOpacity>
          
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
