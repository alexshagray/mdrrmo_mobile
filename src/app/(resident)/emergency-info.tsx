import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  HeartPulse,
  Phone,
  Droplet,
  AlertTriangle,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react-native';
import { getResidentProfileApi, updateResidentEmergencyApi } from '@/shared/api/residents';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
const RELATIONSHIPS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Relative', 'Friend', 'Guardian'];

export default function EmergencyInfoScreen() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Emergency Details State
  const [contactName, setContactName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [relationship, setRelationship] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');

  // UI Feedback
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await getResidentProfileApi();
      const p = res.resident_profile || {};

      setContactName(p.emergency_contact_name || '');
      setContactNumber(p.emergency_contact_number || '');
      setRelationship(p.emergency_contact_relationship || '');
      setBloodType(p.blood_type || '');
      setAllergies(p.allergies || '');
      setMedicalNotes(p.medical_notes || '');
    } catch (err) {
      console.error('Error loading emergency information:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsSaving(true);

    try {
      const payload = {
        emergency_contact_name: contactName.trim() || null,
        emergency_contact_number: contactNumber.trim() || null,
        emergency_contact_relationship: relationship.trim() || null,
        blood_type: bloodType || null,
        allergies: allergies.trim() || null,
        medical_notes: medicalNotes.trim() || null,
      };

      const res = await updateResidentEmergencyApi(payload);
      setSuccessMessage(res.message || 'Emergency information saved successfully.');

      setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Failed to save emergency information. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
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
            <Text className="text-white text-base font-bold tracking-tight">Emergency Information</Text>
            <Text className="text-slate-400 text-xs">Medical & Contacts</Text>
          </View>
          <View className="w-10" />
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#EF4444" />
            <Text className="text-slate-400 text-sm mt-3">Loading emergency data...</Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-5"
            contentContainerStyle={{ paddingVertical: 20, paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Informational Guidance Alert */}
            <View className="flex-row items-start bg-blue-950/40 border border-blue-800/40 rounded-2xl p-4 mb-5">
              <Info size={20} color="#60A5FA" className="mt-0.5" />
              <View className="ml-3 flex-1">
                <Text className="text-blue-200 text-xs font-semibold leading-relaxed">
                  Optional Emergency Record
                </Text>
                <Text className="text-slate-400 text-[11px] leading-relaxed mt-0.5">
                  All fields in this section are optional. Providing these details may assist MDRRMO emergency medical responders during critical field care operations.
                </Text>
              </View>
            </View>

            {/* Feedback Banners */}
            {successMessage ? (
              <View className="flex-row items-center bg-emerald-950/60 border border-emerald-700/50 rounded-2xl p-4 mb-5">
                <CheckCircle2 size={20} color="#10B981" />
                <Text className="text-emerald-300 text-xs font-semibold ml-2.5 flex-1">
                  {successMessage}
                </Text>
              </View>
            ) : null}

            {errorMessage ? (
              <View className="flex-row items-center bg-red-950/60 border border-red-700/50 rounded-2xl p-4 mb-5">
                <AlertCircle size={20} color="#EF4444" />
                <Text className="text-red-300 text-xs font-semibold ml-2.5 flex-1">
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {/* Section: Emergency Contact Person */}
            <View className="bg-[#0F172A]/80 border border-slate-800 rounded-3xl p-5 mb-5 shadow-lg">
              <View className="flex-row items-center mb-4">
                <View className="w-9 h-9 rounded-xl bg-rose-500/10 items-center justify-center border border-rose-500/20 mr-3">
                  <Phone size={18} color="#F43F5E" />
                </View>
                <View>
                  <Text className="text-white font-bold text-base">Emergency Contact Person</Text>
                  <Text className="text-slate-400 text-xs">Primary contact in case of emergency</Text>
                </View>
              </View>

              {/* Contact Name */}
              <View className="mb-3.5">
                <View className="flex-row justify-between items-center mb-1.5 ml-1">
                  <Text className="text-slate-300 text-xs font-semibold">Contact Full Name</Text>
                  <Text className="text-slate-500 text-[11px]">Optional</Text>
                </View>
                <TextInput
                  value={contactName}
                  onChangeText={setContactName}
                  placeholder="e.g. Maria Dela Cruz"
                  placeholderTextColor="#475569"
                  className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-white text-sm focus:border-rose-500"
                />
              </View>

              {/* Contact Number */}
              <View className="mb-3.5">
                <View className="flex-row justify-between items-center mb-1.5 ml-1">
                  <Text className="text-slate-300 text-xs font-semibold">Contact Phone Number</Text>
                  <Text className="text-slate-500 text-[11px]">Optional</Text>
                </View>
                <TextInput
                  value={contactNumber}
                  onChangeText={setContactNumber}
                  placeholder="e.g. 0918 765 4321"
                  placeholderTextColor="#475569"
                  keyboardType="phone-pad"
                  className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-white text-sm focus:border-rose-500"
                />
              </View>

              {/* Relationship Pills */}
              <View>
                <View className="flex-row justify-between items-center mb-1.5 ml-1">
                  <Text className="text-slate-300 text-xs font-semibold">Relationship</Text>
                  <Text className="text-slate-500 text-[11px]">Optional</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
                  <View className="flex-row gap-2">
                    {RELATIONSHIPS.map((rel) => (
                      <TouchableOpacity
                        key={rel}
                        onPress={() => setRelationship(rel === relationship ? '' : rel)}
                        className={`px-3.5 py-2 rounded-xl border ${
                          relationship === rel
                            ? 'bg-rose-500/20 border-rose-500'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                        activeOpacity={0.7}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            relationship === rel ? 'text-rose-400' : 'text-slate-400'
                          }`}
                        >
                          {rel}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            {/* Section: Medical Profile */}
            <View className="bg-[#0F172A]/80 border border-slate-800 rounded-3xl p-5 mb-6 shadow-lg">
              <View className="flex-row items-center mb-4">
                <View className="w-9 h-9 rounded-xl bg-red-500/10 items-center justify-center border border-red-500/20 mr-3">
                  <HeartPulse size={18} color="#EF4444" />
                </View>
                <View>
                  <Text className="text-white font-bold text-base">Medical Background</Text>
                  <Text className="text-slate-400 text-xs">Assists EMT and triage responders</Text>
                </View>
              </View>

              {/* Blood Type */}
              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-2 ml-1">
                  <View className="flex-row items-center">
                    <Droplet size={14} color="#EF4444" />
                    <Text className="text-slate-300 text-xs font-semibold ml-1.5">Blood Type</Text>
                  </View>
                  <Text className="text-slate-500 text-[11px]">Optional</Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {BLOOD_TYPES.map((bt) => (
                    <TouchableOpacity
                      key={bt}
                      onPress={() => setBloodType(bt === bloodType ? '' : bt)}
                      className={`px-3.5 py-2 rounded-xl border ${
                        bloodType === bt
                          ? 'bg-red-500/25 border-red-500'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                      activeOpacity={0.7}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          bloodType === bt ? 'text-red-400' : 'text-slate-400'
                        }`}
                      >
                        {bt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Allergies */}
              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-1.5 ml-1">
                  <View className="flex-row items-center">
                    <AlertTriangle size={14} color="#F59E0B" />
                    <Text className="text-slate-300 text-xs font-semibold ml-1.5">
                      Known Allergies
                    </Text>
                  </View>
                  <Text className="text-slate-500 text-[11px]">Optional</Text>
                </View>
                <TextInput
                  value={allergies}
                  onChangeText={setAllergies}
                  placeholder="e.g. Penicillin, Aspirin, Seafood, Latex..."
                  placeholderTextColor="#475569"
                  multiline
                  numberOfLines={2}
                  className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-white text-sm focus:border-red-500 text-top"
                />
              </View>

              {/* Medical Conditions / Notes */}
              <View>
                <View className="flex-row justify-between items-center mb-1.5 ml-1">
                  <View className="flex-row items-center">
                    <FileText size={14} color="#3B82F6" />
                    <Text className="text-slate-300 text-xs font-semibold ml-1.5">
                      Important Medical Conditions
                    </Text>
                  </View>
                  <Text className="text-slate-500 text-[11px]">Optional</Text>
                </View>
                <TextInput
                  value={medicalNotes}
                  onChangeText={setMedicalNotes}
                  placeholder="e.g. Asthma, Hypertension, Diabetes, Pacemaker implant..."
                  placeholderTextColor="#475569"
                  multiline
                  numberOfLines={3}
                  className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-white text-sm focus:border-red-500 text-top"
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex-1 bg-slate-800/80 border border-slate-700 py-4 rounded-2xl items-center justify-center active:bg-slate-700"
                activeOpacity={0.7}
              >
                <Text className="text-slate-300 font-bold text-sm">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                className="flex-1 bg-rose-600 py-4 rounded-2xl flex-row items-center justify-center shadow-lg shadow-rose-600/30 active:bg-rose-700"
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Save size={18} color="#FFFFFF" className="mr-2" />
                    <Text className="text-white font-bold text-sm ml-2">Save Details</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
