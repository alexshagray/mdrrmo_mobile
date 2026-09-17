import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import {
  ArrowLeft,
  MapPin,
  Shield,
  CheckCircle2,
  XCircle,
  Eye,
  Lock,
  Compass,
  AlertCircle,
  ExternalLink,
} from 'lucide-react-native';

export default function LocationPrivacyScreen() {
  const router = useRouter();

  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    setIsChecking(true);
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);
    } catch (e) {
      console.error('Error checking location permission:', e);
    } finally {
      setIsChecking(false);
    }
  };

  const handleRequestPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      if (status !== Location.PermissionStatus.GRANTED) {
        Linking.openSettings();
      }
    } catch (e) {
      Linking.openSettings();
    }
  };

  const isGranted = permissionStatus === Location.PermissionStatus.GRANTED;

  return (
    <SafeAreaView className="flex-1 bg-[#0B1120]" edges={['top', 'bottom']}>
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
          <Text className="text-white text-base font-bold tracking-tight">Location & Privacy</Text>
          <Text className="text-slate-400 text-xs">Security & GPS Settings</Text>
        </View>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingVertical: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Permission Status Card */}
        <View className="bg-[#0F172A]/80 border border-slate-800 rounded-3xl p-5 mb-5 shadow-lg">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View
                className={`w-10 h-10 rounded-2xl items-center justify-center mr-3 border ${
                  isGranted
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-rose-500/10 border-rose-500/30'
                }`}
              >
                <Compass size={20} color={isGranted ? '#10B981' : '#F43F5E'} />
              </View>
              <View>
                <Text className="text-white font-bold text-base">Location Permission</Text>
                <Text className="text-slate-400 text-xs">Device GPS Sensor Access</Text>
              </View>
            </View>

            {isChecking ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <View
                className={`flex-row items-center px-3 py-1 rounded-full border ${
                  isGranted
                    ? 'bg-emerald-950/60 border-emerald-800/80'
                    : 'bg-rose-950/60 border-rose-800/80'
                }`}
              >
                {isGranted ? (
                  <>
                    <CheckCircle2 size={13} color="#10B981" />
                    <Text className="text-emerald-400 font-extrabold text-xs ml-1.5 uppercase">
                      Enabled
                    </Text>
                  </>
                ) : (
                  <>
                    <XCircle size={13} color="#F43F5E" />
                    <Text className="text-rose-400 font-extrabold text-xs ml-1.5 uppercase">
                      Disabled
                    </Text>
                  </>
                )}
              </View>
            )}
          </View>

          <Text className="text-slate-300 text-xs leading-relaxed mb-4">
            {isGranted
              ? 'Your device location is currently authorized. When you report an emergency, high-accuracy GPS coordinates will be captured to assist MDRRMO responders.'
              : 'Location permission is currently disabled. In an emergency, our dispatchers will not receive automated GPS coordinates without manual address entry.'}
          </Text>

          <TouchableOpacity
            onPress={handleRequestPermission}
            className={`py-3 px-4 rounded-2xl flex-row items-center justify-center border ${
              isGranted
                ? 'bg-slate-800/70 border-slate-700'
                : 'bg-blue-600 border-blue-500 shadow-md shadow-blue-500/30'
            }`}
            activeOpacity={0.8}
          >
            <Text className={`text-xs font-bold ${isGranted ? 'text-slate-300' : 'text-white'}`}>
              {isGranted ? 'Configure in System Settings' : 'Enable Location Permission'}
            </Text>
            <ExternalLink size={14} color={isGranted ? '#94A3B8' : '#FFFFFF'} className="ml-2" />
          </TouchableOpacity>
        </View>

        {/* Why We Use Location */}
        <View className="bg-[#0F172A]/80 border border-slate-800 rounded-3xl p-5 mb-5 shadow-lg">
          <View className="flex-row items-center mb-4">
            <View className="w-9 h-9 rounded-xl bg-blue-500/10 items-center justify-center border border-blue-500/20 mr-3">
              <MapPin size={18} color="#3B82F6" />
            </View>
            <View>
              <Text className="text-white font-bold text-base">Why We Use Location</Text>
              <Text className="text-slate-400 text-xs">Emergency dispatch efficiency</Text>
            </View>
          </View>

          <View className="space-y-3.5">
            <View className="flex-row items-start">
              <View className="w-6 h-6 rounded-full bg-blue-900/40 items-center justify-center mr-3 mt-0.5">
                <Text className="text-blue-400 text-xs font-bold">1</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold text-xs mb-0.5">Pinpointing Emergency Scenes</Text>
                <Text className="text-slate-400 text-[11px] leading-relaxed">
                  When you submit an emergency incident report, your latitude and longitude are immediately relayed to the central command dashboard.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start mt-3">
              <View className="w-6 h-6 rounded-full bg-blue-900/40 items-center justify-center mr-3 mt-0.5">
                <Text className="text-blue-400 text-xs font-bold">2</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold text-xs mb-0.5">Automated Route Optimization</Text>
                <Text className="text-slate-400 text-[11px] leading-relaxed">
                  The system calculates the quickest route from the Opol MDRRMO station to your exact location, shaving minutes off response times.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start mt-3">
              <View className="w-6 h-6 rounded-full bg-blue-900/40 items-center justify-center mr-3 mt-0.5">
                <Text className="text-blue-400 text-xs font-bold">3</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold text-xs mb-0.5">Electric Post & Landmark Geocoding</Text>
                <Text className="text-slate-400 text-[11px] leading-relaxed">
                  Your coordinates map directly to our 8,000+ localized utility poles and landmarks across all 14 barangays in Opol.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Privacy Guarantees */}
        <View className="bg-[#0F172A]/80 border border-slate-800 rounded-3xl p-5 mb-5 shadow-lg">
          <View className="flex-row items-center mb-4">
            <View className="w-9 h-9 rounded-xl bg-emerald-500/10 items-center justify-center border border-emerald-500/20 mr-3">
              <Shield size={18} color="#10B981" />
            </View>
            <View>
              <Text className="text-white font-bold text-base">Your Privacy Matters</Text>
              <Text className="text-slate-400 text-xs">MDRRMO Data Protection Policy</Text>
            </View>
          </View>

          <View className="space-y-3">
            <View className="flex-row items-start">
              <Lock size={15} color="#10B981" className="mt-0.5 mr-2.5" />
              <Text className="text-slate-300 text-xs leading-relaxed flex-1">
                <Text className="font-bold text-white">No Continuous Tracking: </Text>
                The app does <Text className="text-emerald-400 font-semibold">NOT</Text> track or store your location in the background when the application is idle or closed.
              </Text>
            </View>

            <View className="flex-row items-start mt-2.5">
              <Eye size={15} color="#10B981" className="mt-0.5 mr-2.5" />
              <Text className="text-slate-300 text-xs leading-relaxed flex-1">
                <Text className="font-bold text-white">Confidential Usage: </Text>
                Your location data is strictly restricted to authorized MDRRMO emergency dispatchers and the specific response crew assigned to assist you.
              </Text>
            </View>

            <View className="flex-row items-start mt-2.5">
              <Shield size={15} color="#10B981" className="mt-0.5 mr-2.5" />
              <Text className="text-slate-300 text-xs leading-relaxed flex-1">
                <Text className="font-bold text-white">Data Retention: </Text>
                Incident coordinates are archived solely for official dispatch logs and post-incident patient care documentation as required by DILG guidelines.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
